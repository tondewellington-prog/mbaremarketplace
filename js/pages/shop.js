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
        // Fetch seller details using user_id
        const sellerResponse = await fetch(`${SUPABASE_URL}/rest/v1/sellers?user_id=eq.${sellerId}&select=*`, {
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

        // Fetch seller's products using seller_id (UUID)
        const productsResponse = await fetch(`${SUPABASE_URL}/rest/v1/products?seller_id=eq.${sellerId}&select=*&order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!productsResponse.ok) {
            throw new Error('Failed to fetch products');
        }

        const products = await productsResponse.json();

        // Fetch seller ratings using seller_id (UUID)
        const ratingsResponse = await fetch(`${SUPABASE_URL}/rest/v1/ratings?seller_id=eq.${sellerId}&select=rating`, {
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

    // Get unique categories
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

    // Get seller data with fallbacks
    const businessName = seller.business_name || 'Shop Name';
    const shopDescription = seller.shop_description || seller.business_description || '';
    const locationDisplay = seller.location_display_name || seller.business_address || 'Location not specified';
    const phoneNumber = seller.business_phone || '';
    const profileImage = seller.profile_image || seller.logo_url || null;
    const coverImage = seller.cover_image || seller.cover_image_url || null;

    let html = `
        <div class="shop-banner">
            <div class="shop-cover">
                ${coverImage ? `<img src="${coverImage}" alt="${escapeHtml(businessName)}">` : ''}
            </div>
            <div class="container">
                <div class="shop-header">
                    <div class="shop-avatar">
                        ${profileImage ? 
                            `<img src="${profileImage}" alt="${escapeHtml(businessName)}">` :
                            `<div class="placeholder">${businessName ? escapeHtml(businessName.charAt(0).toUpperCase()) : 'S'}</div>`
                        }
                    </div>
                    <div class="shop-info">
                        <h1>${escapeHtml(businessName)}</h1>
                        ${seller.verified ? '<span class="verified-badge">Verified</span>' : ''}
                        <p class="description">${escapeHtml(shopDescription)}</p>
                        <div class="details">
                            <span>${escapeHtml(locationDisplay)}</span>
                            ${phoneNumber ? `<span>Phone: ${escapeHtml(phoneNumber)}</span>` : ''}
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
                        <div class="shop-actions">
                            ${phoneNumber ? `<button class="btn-glass btn-contact" onclick="contactSeller('${escapeHtml(phoneNumber)}', '${escapeHtml(businessName)}')">Contact</button>` : ''}
                            <button class="btn-glass btn-share" onclick="shareShopLink('${shopUrl}')">Share Shop</button>
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
                <span class="icon">&#128230;</span>
                <p>No products available in this shop.</p>
            </div>
        `;
    }

    return `
        <div class="products-grid">
            ${products.map(product => {
                // Use 'stock' column name (from seller-dashboard)
                const stock = product.stock !== null && product.stock !== undefined ? parseInt(product.stock) : 0;
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
// CONTACT SELLER FUNCTION
// ============================================

function contactSeller(phoneNumber, businessName) {
    if (!phoneNumber) {
        showToast('No phone number available for this seller.', true);
        return;
    }

    // Clean the phone number (remove spaces, dashes, etc.)
    let cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Check if it's a Zimbabwe number (starts with 0) and format it
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '263' + cleanPhone.substring(1);
    }
    
    // Check if it already has country code
    if (!cleanPhone.startsWith('263') && !cleanPhone.startsWith('+')) {
        cleanPhone = '263' + cleanPhone;
    }
    
    // Remove any + sign for WhatsApp URL
    const whatsappNumber = cleanPhone.replace('+', '');
    
    // Show contact options modal
    const modalHtml = `
        <div class="contact-modal-overlay" id="contactModal">
            <div class="contact-modal-content">
                <button class="close-modal" onclick="closeContactModal()">&times;</button>
                <h3>Contact ${escapeHtml(businessName)}</h3>
                <p style="color: var(--bubble-text-muted); margin-bottom: 20px;">Choose how you want to contact the seller:</p>
                <div class="contact-options">
                    <button class="contact-option-btn" onclick="openWhatsApp('${whatsappNumber}')">
                        <span class="contact-icon">&#128222;</span>
                        WhatsApp
                        <span style="font-size:12px; color: var(--bubble-text-muted); display:block;">Chat via WhatsApp</span>
                    </button>
                    <button class="contact-option-btn" onclick="openPhoneCall('${cleanPhone}')">
                        <span class="contact-icon">&#9742;</span>
                        Phone Call
                        <span style="font-size:12px; color: var(--bubble-text-muted); display:block;">Call directly</span>
                    </button>
                    <button class="contact-option-btn" onclick="copyPhoneNumber('${phoneNumber}')">
                        <span class="contact-icon">&#128203;</span>
                        Copy Number
                        <span style="font-size:12px; color: var(--bubble-text-muted); display:block;">Copy to clipboard</span>
                    </button>
                </div>
                <button class="btn-glass btn-share" style="width:100%; margin-top:15px;" onclick="closeContactModal()">Cancel</button>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('contactModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Add styles for the modal if not already present
    if (!document.getElementById('contactModalStyles')) {
        const style = document.createElement('style');
        style.id = 'contactModalStyles';
        style.textContent = `
            .contact-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 30000;
                padding: 20px;
                animation: fadeIn 0.3s ease;
            }
            .contact-modal-content {
                background: rgba(10,22,40,0.95);
                backdrop-filter: blur(30px);
                -webkit-backdrop-filter: blur(30px);
                border: 1px solid var(--bubble-glass-border);
                border-radius: 24px;
                max-width: 420px;
                width: 100%;
                padding: 30px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                position: relative;
                animation: slideUp 0.3s ease;
            }
            .contact-modal-content h3 {
                color: #fff;
                font-size: 22px;
                margin-bottom: 8px;
            }
            .close-modal {
                position: absolute;
                top: 15px;
                right: 20px;
                background: none;
                border: none;
                color: var(--bubble-text-muted);
                font-size: 28px;
                cursor: pointer;
                transition: var(--bubble-transition);
            }
            .close-modal:hover {
                color: #fff;
            }
            .contact-options {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin: 10px 0;
            }
            .contact-option-btn {
                background: var(--bubble-glass);
                border: 1px solid var(--bubble-glass-border);
                border-radius: 16px;
                padding: 16px 20px;
                color: #fff;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                transition: var(--bubble-transition);
                text-align: left;
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            .contact-option-btn:hover {
                border-color: var(--bubble-accent);
                background: rgba(179,136,255,0.1);
                transform: translateX(4px);
            }
            .contact-icon {
                font-size: 22px;
                margin-right: 12px;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

// ============================================
// CONTACT HELPER FUNCTIONS
// ============================================

function openWhatsApp(phoneNumber) {
    const message = encodeURIComponent('Hello, I saw your products on Mbare Marketplace and I am interested.');
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    closeContactModal();
}

function openPhoneCall(phoneNumber) {
    window.location.href = `tel:+${phoneNumber}`;
    closeContactModal();
}

function copyPhoneNumber(phoneNumber) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(phoneNumber)
            .then(() => {
                showToast('Phone number copied to clipboard!');
                closeContactModal();
            })
            .catch(() => {
                fallbackCopyText(phoneNumber);
            });
    } else {
        fallbackCopyText(phoneNumber);
    }
}

function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        showToast('Phone number copied to clipboard!');
        closeContactModal();
    } catch (err) {
        showToast('Unable to copy. Please copy manually.', true);
    }
    document.body.removeChild(textArea);
}

function closeContactModal() {
    const modal = document.getElementById('contactModal');
    if (modal) {
        modal.remove();
    }
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

function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification' + (isError ? ' error' : '');
    toast.innerHTML = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bubble-glass);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid var(--bubble-glass-border);
        border-radius: 12px;
        padding: 14px 28px;
        color: #fff;
        font-weight: 500;
        z-index: 99999;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        animation: fadeIn 0.3s ease;
        max-width: 90%;
        text-align: center;
        ${isError ? 'border-color: #dc3545;' : ''}
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
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
window.contactSeller = contactSeller;
window.openWhatsApp = openWhatsApp;
window.openPhoneCall = openPhoneCall;
window.copyPhoneNumber = copyPhoneNumber;
window.closeContactModal = closeContactModal;
window.showToast = showToast;

// Start the page
document.addEventListener('DOMContentLoaded', initShopPage);
