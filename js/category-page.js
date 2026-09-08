// ============================================
// CATEGORY PAGE - Mbare Marketplace
// ============================================

// Supabase Configuration
const SUPABASE_URL = window.SUPABASE_URL || 'https://fnncerdxfhwlrdopswpx.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_qjN17tdmLu5yvp9iIUBEjg_ZDZCWMhK';

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const categoryTitle = document.getElementById('categoryTitle');
const categoryDescription = document.getElementById('categoryDescription');
const loadingSpinner = document.getElementById('loadingSpinner');
const noProductsMessage = document.getElementById('noProductsMessage');
const sortSelect = document.getElementById('sortSelect');
const resultsCount = document.getElementById('resultsCount');

let currentCategory = '';
let allProducts = [];
let filteredProducts = [];
let currentSort = 'newest';
let categoryConfig = null;

// ============================================
// GET URL PARAMETERS
// ============================================

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        category: params.get('category')
    };
}

// ============================================
// GET CATEGORY CONFIG
// ============================================

function getCategoryConfig(categorySlug) {
    if (window.CATEGORY_PAGE_CONFIGS && window.CATEGORY_PAGE_CONFIGS[categorySlug]) {
        return window.CATEGORY_PAGE_CONFIGS[categorySlug];
    }
    return null;
}

// ============================================
// FETCH PRODUCTS
// ============================================

async function fetchCategoryProducts(categorySlug, config) {
    try {
        let query = `${SUPABASE_URL}/rest/v1/products?`;

        if (config.fetchQuery) {
            query += config.fetchQuery;
        } else {
            query += 'select=*&order=created_at.desc';
        }

        const response = await fetch(query, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }

        let products = await response.json();

        if (config.filter) {
            products = products.filter(product => {
                const categoryMatch = config.filter.categoryKeywords.some(keyword =>
                    product.category && product.category.toLowerCase().includes(keyword.toLowerCase())
                );
                const titleMatch = config.filter.titleKeywords.some(keyword =>
                    product.title && product.title.toLowerCase().includes(keyword.toLowerCase())
                );
                const descMatch = config.filter.descriptionKeywords.some(keyword =>
                    product.description && product.description.toLowerCase().includes(keyword.toLowerCase())
                );
                return categoryMatch || titleMatch || descMatch;
            });
        }

        return products;

    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

// ============================================
// RENDER PRODUCTS
// ============================================

function renderProducts(products, config) {
    if (!productsGrid) return;

    if (!products || products.length === 0) {
        productsGrid.innerHTML = `
            <div class="no-products">
                <span class="no-products-icon">&#128230;</span>
                <p>${config.emptyMessage || 'No products found in this category.'}</p>
            </div>
        `;
        if (resultsCount) resultsCount.textContent = '0 products found';
        return;
    }

    if (resultsCount) {
        resultsCount.textContent = `${products.length} product${products.length > 1 ? 's' : ''} found`;
    }

    let html = '<div class="products-grid">';

    products.forEach(product => {
        const stock = product.stock !== null && product.stock !== undefined ? parseInt(product.stock) : 0;
        const stockText = stock > 0 ? 'In Stock' : 'Out of Stock';
        const stockClass = stock > 0 ? 'in-stock' : 'out-of-stock';
        const imageUrl = product.image_url || 'https://via.placeholder.com/300x300?text=Product';

        html += `
            <div class="product-card" onclick="goToProduct('${product.id}')">
                <img src="${imageUrl}" alt="${escapeHtml(product.title)}" onerror="this.src='https://via.placeholder.com/300x300?text=Product'">
                <div class="product-info">
                    <div class="product-title">${escapeHtml(product.title)}</div>
                    <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
                    <div class="product-stock ${stockClass}">${stockText}</div>
                    ${product.category ? `<div class="product-category-tag">${escapeHtml(product.category)}</div>` : ''}
                    <div class="product-seller">${escapeHtml(product.seller_name || config.sellerFallback || 'Seller')}</div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    productsGrid.innerHTML = html;
}

// ============================================
// SORT PRODUCTS
// ============================================

function sortProducts(products, sortType) {
    const sorted = [...products];

    switch (sortType) {
        case 'newest':
            sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'oldest':
            sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 'price-low':
            sorted.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            break;
        case 'price-high':
            sorted.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            break;
        case 'name':
            sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            break;
        default:
            sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return sorted;
}

// ============================================
// APPLY FILTERS & SORT
// ============================================

function applyFiltersAndSort() {
    if (!allProducts) return;

    const sortValue = sortSelect ? sortSelect.value : 'newest';
    const sorted = sortProducts(allProducts, sortValue);
    filteredProducts = sorted;
    renderProducts(sorted, categoryConfig);
}

// ============================================
// NAVIGATION
// ============================================

function goToProduct(productId) {
    window.location.href = `product-detail.html?id=${productId}`;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCategoryDisplayName(slug) {
    const names = {
        'books': 'Books',
        'clothing': 'Clothing & Fashion',
        'electronics': 'Electronics',
        'hardware': 'Hardware & Tools',
        'farm-products': 'Farm Products',
        'beauty-cosmetics': 'Beauty & Cosmetics',
        'home-and-kitchen': 'Home & Kitchen',
        'pet-supplies': 'Pet Supplies',
        'pets-livestock': 'Pets & Livestock',
        'vehicles-transportation': 'Vehicles & Transportation',
        'vehicle-parts': 'Vehicle Parts & Accessories'
    };
    return names[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getCategoryDescription(slug) {
    const descriptions = {
        'books': 'Discover a wide selection of books, literature, textbooks, novels, and magazines.',
        'clothing': 'Shop the latest fashion trends, apparel, shoes, and accessories.',
        'electronics': 'Find the best electronics, gadgets, computers, phones, and tech products.',
        'hardware': 'Browse tools, building materials, construction supplies, and hardware items.',
        'farm-products': 'Explore farm produce, crops, vegetables, fruits, seeds, and fertilizers.',
        'beauty-cosmetics': 'Discover beauty products, cosmetics, skincare, and personal care items.',
        'home-and-kitchen': 'Find home essentials, kitchenware, furniture, and household items.',
        'pet-supplies': 'Shop pet food, accessories, toys, and supplies for your furry friends.',
        'pets-livestock': 'Browse pets, livestock, animals, and related products.',
        'vehicles-transportation': 'Find vehicles, cars, trucks, motorcycles, and transportation services.',
        'vehicle-parts': 'Shop vehicle parts, accessories, spares, and automotive components.'
    };
    return descriptions[slug] || `Browse ${getCategoryDisplayName(slug)} products on Mbare Marketplace.`;
}

// ============================================
// INITIALIZATION
// ============================================

async function initCategoryPage() {
    try {
        const params = getUrlParams();
        currentCategory = params.category;

        if (!currentCategory) {
            if (categoryTitle) categoryTitle.textContent = 'Category Not Found';
            if (productsGrid) {
                productsGrid.innerHTML = `
                    <div class="no-products">
                        <span class="no-products-icon">&#9888;</span>
                        <p>No category specified. Please select a category from the navigation menu.</p>
                    </div>
                `;
            }
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (resultsCount) resultsCount.textContent = '0 products found';
            return;
        }

        categoryConfig = getCategoryConfig(currentCategory);

        if (!categoryConfig) {
            if (categoryTitle) categoryTitle.textContent = 'Category Not Found';
            if (productsGrid) {
                productsGrid.innerHTML = `
                    <div class="no-products">
                        <span class="no-products-icon">&#9888;</span>
                        <p>Category "${currentCategory}" not found.</p>
                    </div>
                `;
            }
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (resultsCount) resultsCount.textContent = '0 products found';
            return;
        }

        const displayName = getCategoryDisplayName(currentCategory);
        if (categoryTitle) categoryTitle.textContent = displayName;
        if (categoryDescription) categoryDescription.textContent = getCategoryDescription(currentCategory);

        const products = await fetchCategoryProducts(currentCategory, categoryConfig);
        allProducts = products;

        applyFiltersAndSort();

        if (loadingSpinner) loadingSpinner.style.display = 'none';

        if (sortSelect) {
            sortSelect.addEventListener('change', applyFiltersAndSort);
        }

    } catch (error) {
        console.error('Category page error:', error);
        if (productsGrid) {
            productsGrid.innerHTML = `
                <div class="no-products">
                    <span class="no-products-icon">&#9888;</span>
                    <p>Something went wrong. Please try again later.</p>
                    <p style="font-size: 12px; color: var(--bubble-text-muted);">${error.message}</p>
                </div>
            `;
        }
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (resultsCount) resultsCount.textContent = 'Error loading products';
    }
}

// Make functions globally available
window.goToProduct = goToProduct;
window.applyFiltersAndSort = applyFiltersAndSort;

// Start the page
document.addEventListener('DOMContentLoaded', initCategoryPage);
