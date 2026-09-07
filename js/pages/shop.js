// ============================================
// SHOP PAGE - Mbare Marketplace
// ============================================

// Supabase Configuration
const SUPABASE_URL = window.SUPABASE_URL || 'https://fnncerdxfhwlrdopswpx.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_qjN17tdmLu5yvp9iIUBEjg_ZDZCWMhK';

// DOM Elements
const shopContent = document.getElementById('shopContent');
let shopData = null;
let productsData = [];
let currentCategory = 'All';
let currentSort = 'newest';

// ============================================
// GET URL PARAMETERS
// ============================================

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        sellerId: params.get('seller'),
        productId: params.get('product')
    };
}

// ============================================
// FETCH SHOP DATA
// ============================================

async function fetchShopData(sellerId) {
    try {
        // Fetch seller details - using id instead of user_id
        const sellerResponse = await fetch(`${SUPABASE_URL}/rest/v1/sellers?id=eq.${sellerId}&select=*`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!sellerResponse.ok) {
            throw new Error('Failed to fetch seller data');
        }

        const sellers = await sellerResponse.json();
        if (!sellers || sellers.length === 0) {
            throw new Error('Seller not found');
        }

        const seller = sellers[0];

        // Fetch seller's products - using seller_id to match the seller's id
        const productsResponse = await fetch(`${SUPABASE_URL}/rest/v1/products?seller_id=eq.${seller.id}&select=*&order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!productsResponse.ok) {
            throw new Error('Failed to fetch products');
        }

        const products = await productsResponse.json();

        // Fetch seller ratings - using seller_id
        const ratingsResponse = await fetch(`${SUPABASE_URL}/rest/v1/ratings?seller_id=eq.${seller.id}&select=rating`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        let avgRating = 0;
        let ratingCount = 0;
        if (ratingsResponse.ok) {
            const ratings = await ratingsResponse.json();
            if (ratings && ratings.length > 0) {
                const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
                avgRating = sum / ratings.length;
                ratingCount = ratings.length;
            }
        }

        return {
            seller: seller,
            products: products,
            rating: avgRating,
            ratingCount: ratingCount
        };

    } catch (error) {
        console.error('Error fetching shop data:', error);
        throw error;
    }
}

// ============================================
// RENDER SHOP PAGE
// ============================================

function renderShop(data) {
    const seller = data.seller;
    const products = data.products;
    const rating = data.rating || 0;
    const ratingCount = data.ratingCount || 0;

    const shopUrl = window.location.href;

    const categories = ['All'];
    const categoryMap = { All: products.length };

    products.forEach(p => {
        if (p.category && p.category !== 'Uncategorized') {
            if (!categoryMap[p.category]) {
                categories.push(p.category);
                categoryMap[p.category] = 0;
            }
            categoryMap[p.category]++;
        }
    });

    let html = `
        <div class="shop-banner">
            <div class="shop-cover">
                ${seller.cover_image_url ? `<img src="${seller.cover_image_url}" alt="${escapeHtml(seller.business_name)}">` : ''}
            </div>
            <div class="container">
                <div class="shop-header">
                    <div class="shop-avatar">
                        ${seller.logo_url ? 
                            `<img src="${seller.logo_url}" alt="${escapeHtml(seller.business_name)}">` :
                            `<div class="placeholder">${seller.business_name ? escapeHtml(seller.business_name.charAt(0).toUpperCase()) : 'S'}</div>`
                        }
                    </div>
                    <div class="shop-info">
                        <h1>${escapeHtml(seller.business_name || 'Shop Name')}</h1>
                        ${seller.verified ? '<span class="verified-badge">Verified</span>' : ''}
                        <p class="description">${escapeHtml(seller.business_description || '')}</p>
                        <div class="details">
                            <span>${seller.business_address ? 'Location: ' + escapeHtml(seller.business_address) : 'Location not specified'}</span>
                            ${seller.business_phone ? `<span>Phone: ${escapeHtml(seller.business_phone)}</span>` : ''}
                        </div>
                        <div class="shop-stats">
                            <div class="shop-stat">
                                <div class="num">${products.length}</div>
                                <div class="label">Products</div>
                            </div>
                            <div class="shop-stat">
                                <div class="rating">${rating > 0 ? '★ ' + rating.toFixed(1) : '★ New'}</div>
                                <div class="label">${ratingCount > 0 ? ratingCount + ' ' + (ratingCount === 1 ? 'rating' : 'ratings') : 'No ratings yet'}</div>
                            </div>
                        </div>
                        <div class="action-buttons">
                            ${seller.business_phone ? `<a href="tel:${escapeHtml(seller.business_phone)}" class="contact-btn">Contact</a>` : ''}
                            <button class="share-btn" onclick="shareShopLink('${shopUrl}')">Share Shop</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="container">
            <div class="main-content">
                <div class="sidebar">
                    <div class="sidebar-section">
                        <h3>Categories</h3>
                        <ul class="category-list" id="categoryList">
                            ${categories.map(cat => `
                                <li class="${cat === currentCategory ? 'active' : ''}" data-category="${cat}" onclick="filterByCategory('${cat}')">
                                    ${escapeHtml(cat)} <span class="count">(${categoryMap[cat] || 0})</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    <div class="sidebar-section">
                        <h3>Search</h3>
                        <input type="text" class="search-box" id="searchProducts" placeholder="Search products..." oninput="filterProducts()">
                        <h3 style="margin-top:15px;">Sort By</h3>
                        <select class="sort-select" id="sortSelect" onchange="sortProducts()">
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                            <option value="name">Name A-Z</option>
                        </select>
                    </div>
                </div>
                <div class="products-area">
                    <div id="productsContainer">
                        ${renderProductGrid(products)}
                    </div>
                </div>
            </div>
        </div>
    `;

    shopContent.innerHTML = html;
    shopData = data;
    productsData = products;
}

// ============================================
// RENDER PRODUCT GRID
// ============================================

function renderProductGrid(products) {
    if (!products || products.length === 0) {
        return `
            <div class="no-products">
                <span class="icon">📦</span>
                <p>No products available in this shop.</p>
            </div>
        `;
    }

    return `
        <div class="products-grid">
            ${products.map(product => {
                // Properly check stock quantity
                const stock = product.stock_quantity !== null && product.stock_quantity !== undefined ? parseInt(product.stock_quantity) : 0;
                const stockText = stock > 0 ? 'In Stock' : 'Out of Stock';
                const stockClass = stock > 0 ? 'in-stock' : 'out-of-stock';
                return `
                    <div class="product-card" onclick="goToProduct('${product.id}')">
                        <img src="${product.image_url || 'https://via.placeholder.com/300x300?text=Product'}" 
                             alt="${escapeHtml(product.title)}" 
                             onerror="this.src='https://via.placeholder.com/300x300?text=Product'">
                        <div class="info">
                            <div class="title">${escapeHtml(product.title)}</div>
                            <div class="price">$${parseFloat(product.price).toFixed(2)}</div>
                            <div class="stock ${stockClass}">${stockText}</div>
                            ${product.category ? `<span class="category-tag">${escapeHtml(product.category)}</span>` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ============================================
// FILTERING & SORTING
// ============================================

function filterByCategory(category) {
    currentCategory = category;
    
    document.querySelectorAll('.category-list li').forEach(el => {
        el.classList.toggle('active', el.dataset.category === category);
    });

    filterProducts();
}

function filterProducts() {
    const searchTerm = document.getElementById('searchProducts')?.value?.toLowerCase() || '';
    const sortValue = document.getElementById('sortSelect')?.value || 'newest';
    currentSort = sortValue;

    let filtered = [...productsData];

    if (currentCategory !== 'All') {
        filtered = filtered.filter(p => p.category === currentCategory);
    }

    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.title?.toLowerCase().includes(searchTerm) || 
            p.description?.toLowerCase().includes(searchTerm)
        );
    }

    switch (sortValue) {
        case 'newest':
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'oldest':
            filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 'price-low':
            filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            break;
        case 'price-high':
            filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            break;
        case 'name':
            filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            break;
    }

    const container = document.getElementById('productsContainer');
    if (container) {
        container.innerHTML = renderProductGrid(filtered);
    }
}

function sortProducts() {
    filterProducts();
}

// ============================================
// NAVIGATION
// ============================================

function goToProduct(productId) {
    window.location.href = `product-detail.html?id=${productId}`;
}

// ============================================
// SHARE FUNCTION
// ============================================

function shareShopLink(shopUrl) {
    const url = shopUrl || window.location.href;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url)
            .then(() => showShareNotification('Shop link copied to clipboard'))
            .catch(() => fallbackCopyTextToClipboard(url));
    } else {
        fallbackCopyTextToClipboard(url);
    }
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showShareNotification('Shop link copied to clipboard');
        } else {
            showShareNotification('Unable to copy link. Please copy the URL manually.');
        }
    } catch (err) {
        showShareNotification('Unable to copy link. Please copy the URL manually.');
    }

    document.body.removeChild(textArea);
}

function showShareNotification(message) {
    const notification = document.getElementById('shareNotification');
    if (!notification) return;

    notification.textContent = message;
    notification.classList.add('show');

    clearTimeout(notification._timeout);
    notification._timeout = setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
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

// ============================================
// INITIALIZATION
// ============================================

async function initShopPage() {
    try {
        const params = getUrlParams();
        const sellerId = params.sellerId;

        if (!sellerId) {
            shopContent.innerHTML = `
                <div class="container" style="padding: 60px 20px; text-align: center;">
                    <div class="error">
                        <h2>No Shop Selected</h2>
                        <p>Please provide a seller ID to view their shop.</p>
                        <br>
                        <a href="index.html" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,var(--bubble-accent),var(--bubble-accent2));color:#fff;border-radius:50px;text-decoration:none;font-weight:600;transition:var(--bubble-transition);">Return Home</a>
                    </div>
                </div>
            `;
            return;
        }

        const data = await fetchShopData(sellerId);
        renderShop(data);

    } catch (error) {
        console.error('Shop page error:', error);
        shopContent.innerHTML = `
            <div class="container" style="padding: 60px 20px; text-align: center;">
                <div class="error">
                    <h2>Something went wrong</h2>
                    <p>${error.message || 'Unable to load shop. Please try again later.'}</p>
                    <br>
                    <a href="index.html" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,var(--bubble-accent),var(--bubble-accent2));color:#fff;border-radius:50px;text-decoration:none;font-weight:600;transition:var(--bubble-transition);">Return Home</a>
                </div>
            </div>
        `;
    }
}

// Make functions globally available
window.filterByCategory = filterByCategory;
window.filterProducts = filterProducts;
window.sortProducts = sortProducts;
window.goToProduct = goToProduct;
window.shareShopLink = shareShopLink;

// Start the page
document.addEventListener('DOMContentLoaded', initShopPage);
