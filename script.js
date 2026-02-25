// ============================================
// Mbare Marketplace - Main JavaScript (Connected to Backend)
// ============================================

// Product Data - Will be loaded from API
let products = [];
let basket = [];
let sellersMap = {};

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // ADD THIS CHECK FOR API
        if (!window.api) {
            console.log('Waiting for API to load...');
            // Wait a moment for API to load
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Load sellers first
        await loadSellersFromAPI();
        
        // Load products from API
        await loadProductsFromAPI();
        
        // Load user basket if logged in
        await loadBasketFromAPI();
        
        // Load products on homepage
        if (document.getElementById('todaysDeals')) {
            loadProducts('todaysDeals', products.slice(0, 4));
            loadProducts('bestSellers', products.slice(4, 8));
            loadProducts('recommended', products.slice(8, 12));
        }
        
        // Load all products section if it exists
        if (document.getElementById('allProducts')) {
            loadProducts('allProducts', products);
        }
        
        // Load product detail if on product page
        if (document.getElementById('productDetail')) {
            await loadProductDetail();
        }
        
        // Load Basket if on Basket page
        if (document.getElementById('basketItems')) {
            await loadBasket();
        }
        
        // Auto-rotate carousel
        if (document.getElementById('carouselSlides')) {
            setInterval(() => {
                moveCarousel(1);
            }, 5000);
        }
        
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleSearch();
                }
            });
        }
    } catch (error) {
        console.error('Initialization error:', error);
        // Fallback to local data if API fails
        loadFallbackProducts();
    }
});

// Load sellers from API
async function loadSellersFromAPI() {
    try {
        const SUPABASE_URL = window.SUPABASE_URL;
        const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
        
        console.log('Loading sellers...');
        const response = await fetch(`${SUPABASE_URL}/rest/v1/sellers?select=*`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        const sellers = await response.json();
        console.log('Sellers loaded:', sellers);
        
        // Create a map of sellers by user_id
        if (Array.isArray(sellers)) {
            sellers.forEach(seller => {
                sellersMap[seller.user_id] = seller;
            });
            console.log('Sellers map created:', Object.keys(sellersMap).length, 'sellers');
        }
    } catch (error) {
        console.error('Failed to load sellers:', error);
    }
}

// Load products from API
async function loadProductsFromAPI() {
    try {
        const SUPABASE_URL = window.SUPABASE_URL;
        const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
        
        console.log('Loading products...');
        const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        const data = await response.json();
        console.log('Products loaded:', data);
        
        if (Array.isArray(data)) {
            products = data.map(p => ({
                id: p.id,
                title: p.title,
                price: parseFloat(p.price),
                rating: 4.0,
                reviews: 0,
                image: p.image_url || 'https://via.placeholder.com/300x300?text=Product',
                category: p.category || 'Uncategorized',
                description: p.description || '',
                features: p.features || [],
                seller_id: p.seller_id,
                image_url: p.image_url,
                seller: sellersMap[p.seller_id] || null
            }));
            console.log('Products mapped:', products.length);
        }
    } catch (error) {
        console.error('Failed to load products from API:', error);
        throw error;
    }
}

// Load basket from API (if user is logged in)
async function loadBasketFromAPI() {
    try {
        // Check if user is logged in
        const sessionData = localStorage.getItem('supabase_session');
        if (sessionData) {
            // For now, use localStorage for basket
            basket = JSON.parse(localStorage.getItem('basket')) || [];
        } else {
            // Load from localStorage
            basket = JSON.parse(localStorage.getItem('basket')) || [];
        }
        updateBasketCount();
    } catch (error) {
        console.error('Failed to load basket:', error);
        // Fallback to localStorage
        basket = JSON.parse(localStorage.getItem('basket')) || [];
        updateBasketCount();
    }
}

// Fallback products if API fails
function loadFallbackProducts() {
    products = [
        {
            id: 1,
            title: "Wireless Bluetooth Headphones with Noise Cancellation",
            price: 79.99,
            rating: 4.5,
            reviews: 1234,
            image: "https://via.placeholder.com/300x300?text=Headphones",
            category: "Electronics",
            description: "Premium wireless headphones with active noise cancellation, 30-hour battery life, and superior sound quality.",
            features: ["Active Noise Cancellation", "30-hour battery", "Quick charge", "Comfortable design"]
        },
        {
            id: 2,
            title: "Smart Watch with Fitness Tracking",
            price: 199.99,
            rating: 4.7,
            reviews: 2567,
            image: "https://via.placeholder.com/300x300?text=Smart+Watch",
            category: "Electronics",
            description: "Advanced smartwatch with heart rate monitoring, GPS, and 7-day battery life.",
            features: ["Heart rate monitor", "GPS tracking", "Water resistant", "7-day battery"]
        }
    ];
    
    if (document.getElementById('todaysDeals')) {
        loadProducts('todaysDeals', products.slice(0, 4));
        loadProducts('bestSellers', products.slice(4, 8));
        loadProducts('recommended', products.slice(8, 12));
    }
    
    if (document.getElementById('allProducts')) {
        loadProducts('allProducts', products);
    }
}

// Load products into grid
function loadProducts(containerId, productList) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    productList.forEach(product => {
        const productCard = createProductCard(product);
        container.appendChild(productCard);
    });
}

// Create product card element
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const stars = generateStars(product.rating);
    const seller = product.seller || sellersMap[product.seller_id] || {};
    const sellerName = seller.business_name || 'Unknown Seller';
    const imageUrl = product.image_url || product.image || 'https://via.placeholder.com/300x300?text=Product';
    
    card.innerHTML = `
        <img src="${imageUrl}" alt="${product.title}" class="product-image" onclick="window.location.href='product-detail.html?id=${product.id}'" style="cursor: pointer;" onerror="this.src='https://via.placeholder.com/300x300?text=Product'">
        <h3 class="product-title" onclick="window.location.href='product-detail.html?id=${product.id}'" style="cursor: pointer;">${product.title}</h3>
        <div class="product-rating">
            <span class="stars">${stars}</span>
            <span class="rating-count">(${product.reviews})</span>
        </div>
        <div class="product-price">
            <span class="currency">$</span>${product.price.toFixed(2)}
        </div>
        <div class="product-seller" style="font-size: 12px; color: #666; margin: 5px 0;">
            Seller: ${sellerName}
        </div>
        <div class="product-actions">
            <button class="btn-add-cart" onclick="addToBasket('${product.id}')">Add to Basket</button>
            <button class="btn-contact-seller" onclick="showSellerContact('${product.id}')" style="background: #25D366; color: white; border: none; padding: 8px; border-radius: 4px; margin-top: 5px; width: 100%; cursor: pointer;">Contact Seller</button>
        </div>
    `;
    
    return card;
}

// Show seller contact information
function showSellerContact(productId) {
    const product = products.find(p => p.id == productId);
    
    if (!product) {
        alert('Product not found');
        return;
    }
    
    const seller = sellersMap[product.seller_id];
    
    if (!seller) {
        alert('Seller information not available');
        return;
    }
    
    const phone = seller.business_phone || 'Not provided';
    const phoneDigits = phone.replace(/\D/g, '');
    const whatsappLink = phoneDigits ? `https://wa.me/${phoneDigits}?text=Hi, I'm interested in ${encodeURIComponent(product.title)}` : '#';
    const callLink = phoneDigits ? `tel:${phoneDigits}` : '#';
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('sellerContactModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sellerContactModal';
        modal.className = 'contact-modal';
        modal.innerHTML = `
            <div class="contact-modal-content">
                <span class="close-contact-modal" onclick="document.getElementById('sellerContactModal').style.display='none'">&times;</span>
                <div id="sellerContactContent"></div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add modal styles if not present
        if (!document.querySelector('#contactModalStyles')) {
            const style = document.createElement('style');
            style.id = 'contactModalStyles';
            style.textContent = `
                .contact-modal {
                    display: none;
                    position: fixed;
                    z-index: 2000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0,0,0,0.5);
                }
                .contact-modal-content {
                    background-color: white;
                    margin: 15% auto;
                    padding: 30px;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 500px;
                    position: relative;
                    animation: slideDown 0.3s ease-out;
                }
                .close-contact-modal {
                    position: absolute;
                    top: 15px;
                    right: 20px;
                    font-size: 28px;
                    font-weight: bold;
                    color: #666;
                    cursor: pointer;
                }
                .close-contact-modal:hover {
                    color: #000;
                }
                .seller-info {
                    margin-top: 20px;
                }
                .info-row {
                    display: flex;
                    align-items: center;
                    margin-bottom: 15px;
                    padding: 10px;
                    background: #f5f5f5;
                    border-radius: 4px;
                }
                .info-icon {
                    width: 40px;
                    height: 40px;
                    background: #232f3e;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 15px;
                }
                .info-text {
                    flex: 1;
                }
                .info-label {
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 3px;
                }
                .info-value {
                    font-size: 16px;
                    font-weight: 500;
                    color: #232f3e;
                }
                .contact-actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 20px;
                }
                .contact-btn {
                    flex: 1;
                    padding: 12px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    text-align: center;
                    text-decoration: none;
                }
                .call-btn {
                    background: #28a745;
                    color: white;
                }
                .call-btn:hover {
                    background: #218838;
                }
                .whatsapp-btn {
                    background: #25D366;
                    color: white;
                }
                .whatsapp-btn:hover {
                    background: #128C7E;
                }
                .product-title {
                    font-size: 18px;
                    font-weight: 600;
                    margin-bottom: 10px;
                    color: #232f3e;
                }
                @keyframes slideDown {
                    from {
                        transform: translateY(-100px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    const modalContent = document.getElementById('sellerContactContent');
    modalContent.innerHTML = `
        <div class="product-title">${product.title}</div>
        <div class="seller-info">
            <div class="info-row">
                <div class="info-icon">🏪</div>
                <div class="info-text">
                    <div class="info-label">Seller</div>
                    <div class="info-value">${seller.business_name || 'Unknown Seller'}</div>
                </div>
            </div>
            <div class="info-row">
                <div class="info-icon">📞</div>
                <div class="info-text">
                    <div class="info-label">Phone Number</div>
                    <div class="info-value">${phone}</div>
                </div>
            </div>
            <div class="info-row">
                <div class="info-icon">📍</div>
                <div class="info-text">
                    <div class="info-label">Shop Location</div>
                    <div class="info-value">${seller.business_address || 'Location not specified'}</div>
                </div>
            </div>
            <div class="info-row">
                <div class="info-icon">📦</div>
                <div class="info-text">
                    <div class="info-label">Price</div>
                    <div class="info-value">$${product.price.toFixed(2)}</div>
                </div>
            </div>
        </div>
        <div class="contact-actions">
            <a href="${callLink}" class="contact-btn call-btn" ${!phoneDigits ? 'onclick="alert(\'Phone number not available\'); return false;"' : ''}>
                📞 Call Seller
            </a>
            <a href="${whatsappLink}" class="contact-btn whatsapp-btn" target="_blank" ${!phoneDigits ? 'onclick="alert(\'Phone number not available\'); return false;"' : ''}>
                💬 WhatsApp
            </a>
        </div>
    `;
    
    modal.style.display = 'block';
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

// Generate star rating HTML
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let starsHTML = '';
    
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '★';
    }
    
    if (hasHalfStar) {
        starsHTML += '☆';
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '☆';
    }
    
    return starsHTML;
}

// Add to Basket
async function addToBasket(productId, quantity = 1) {
    try {
        const product = products.find(p => p.id == productId);
        if (!product) {
            showNotification('Product not found');
            return;
        }
        
        const existingItem = basket.find(item => item.id == productId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            basket.push({
                id: product.id,
                title: product.title,
                price: product.price,
                image: product.image,
                quantity: quantity,
                seller_id: product.seller_id
            });
        }
        
        localStorage.setItem('basket', JSON.stringify(basket));
        updateBasketCount();
        showNotification('Item added to Basket!');
    } catch (error) {
        console.error('Error adding to basket:', error);
        showNotification('Failed to add item to basket');
    }
}

// Update Basket count
function updateBasketCount() {
    const basketCount = document.getElementById('basketCount');
    if (basketCount) {
        const totalItems = basket.reduce((sum, item) => sum + (item.quantity || 0), 0);
        basketCount.textContent = totalItems;
        basketCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #232F3E;
        color: white;
        padding: 15px 25px;
        border-radius: 4px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Carousel functionality
let currentSlide = 0;
const totalSlides = 3;

function moveCarousel(direction) {
    const slides = document.getElementById('carouselSlides');
    const indicators = document.querySelectorAll('.indicator');
    
    currentSlide += direction;
    
    if (currentSlide < 0) {
        currentSlide = totalSlides - 1;
    } else if (currentSlide >= totalSlides) {
        currentSlide = 0;
    }
    
    slides.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === currentSlide);
    });
}

function goToSlide(index) {
    currentSlide = index;
    moveCarousel(0);
}

// Load product detail
async function loadProductDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
        document.getElementById('productDetail').innerHTML = '<p>Product not found</p>';
        return;
    }
    
    const product = products.find(p => p.id == productId);
    if (!product) {
        document.getElementById('productDetail').innerHTML = '<p>Product not found</p>';
        return;
    }
    
    displayProductDetail(product);
}

function displayProductDetail(product) {
    const stars = generateStars(product.rating || 4.0);
    const seller = sellersMap[product.seller_id] || {};
    const whatsappNumber = seller.business_phone || '';
    const shopLocation = seller.business_address || 'Location not specified';
    
    document.getElementById('productDetail').innerHTML = `
        <div class="product-detail-image-container">
            <img src="${product.image_url || product.image}" alt="${product.title}" class="product-detail-image" id="productMainImage" onerror="this.src='https://via.placeholder.com/500x500?text=Product'">
        </div>
        <div class="product-detail-info">
            <h1>${product.title}</h1>
            <div class="product-detail-rating">
                <span class="stars">${stars}</span>
                <span class="rating-count">${product.reviews || 0} ratings</span>
            </div>
            <div class="product-detail-price">
                <span class="currency">$</span>${product.price.toFixed(2)}
            </div>
            <p class="product-detail-description">${product.description || ''}</p>
            <ul class="product-detail-features">
                ${(product.features || []).map(feature => `<li>${feature}</li>`).join('')}
            </ul>
            
            ${seller.business_name ? `
            <div style="margin: 30px 0; padding: 20px; background: #f5f5f5; border-radius: 4px;">
                <h3 style="margin-bottom: 15px; font-size: 18px;">Seller Information</h3>
                <p style="margin-bottom: 10px;"><strong>Shop:</strong> ${seller.business_name}</p>
                <p style="margin-bottom: 10px;"><strong>📍 Location:</strong> ${shopLocation}</p>
                ${whatsappNumber ? `
                    <div style="margin-top: 15px;">
                        <a href="https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=Hi, I'm interested in ${encodeURIComponent(product.title)}" 
                           target="_blank" 
                           class="btn-buy-now-large" 
                           style="display: inline-block; text-decoration: none; background: #25D366; color: white; padding: 12px 30px; border-radius: 4px; font-weight: 600;">
                            💬 Contact Seller on WhatsApp
                        </a>
                    </div>
                ` : ''}
            </div>
            ` : ''}
            
            <div class="detail-actions">
                <button class="btn-add-cart-large" onclick="addToBasket('${product.id}')">Add to Basket</button>
                ${whatsappNumber ? `
                    <a href="https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=Hi, I'm interested in ${encodeURIComponent(product.title)}" 
                       target="_blank" 
                       class="btn-buy-now-large" 
                       style="display: inline-block; text-decoration: none; background: #25D366; color: white;">
                        💬 Buy via WhatsApp
                    </a>
                ` : `
                    <button class="btn-buy-now-large" onclick="buyNow('${product.id}')">Buy Now</button>
                `}
            </div>
        </div>
    `;
    
    // Image zoom effect
    const productImage = document.getElementById('productMainImage');
    if (productImage) {
        productImage.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
            this.style.transition = 'transform 0.3s';
        });
        
        productImage.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    }
}

// Buy now
async function buyNow(productId) {
    await addToBasket(productId, 1);
    setTimeout(() => {
        window.location.href = 'checkout.html';
    }, 500);
}

// Load Basket page
async function loadBasket() {
    const basketItemsContainer = document.getElementById('basketItems');
    const basketSummary = document.getElementById('basketSummary');
    
    if (!basketItemsContainer) return;
    
    // Load from localStorage
    basket = JSON.parse(localStorage.getItem('basket')) || [];
    
    if (basket.length === 0) {
        basketItemsContainer.innerHTML = '<p style="text-align: center; padding: 40px;">Your Basket is empty.</p>';
        if (basketSummary) {
            basketSummary.innerHTML = '';
        }
        return;
    }
    
    basketItemsContainer.innerHTML = '';
    
    for (const item of basket) {
        const basketItem = document.createElement('div');
        basketItem.className = 'basket-item';
        basketItem.innerHTML = `
            <img src="${item.image}" alt="${item.title}" class="basket-item-image" onerror="this.src='https://via.placeholder.com/150x150?text=Product'">
            <div class="basket-item-info">
                <a href="product-detail.html?id=${item.id}" class="basket-item-title">${item.title}</a>
                <div class="basket-item-price">$${item.price.toFixed(2)}</div>
                <div class="basket-item-actions">
                    <div class="quantity-selector">
                        <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1" onchange="updateQuantity('${item.id}', 0, this.value)">
                        <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                    </div>
                    <button class="remove-item" onclick="removeFromBasket('${item.id}')">Remove</button>
                </div>
            </div>
        `;
        basketItemsContainer.appendChild(basketItem);
    }
    
    updateBasketSummary();
}

// Update quantity
async function updateQuantity(productId, change, newValue) {
    const item = basket.find(i => i.id == productId);
    if (!item) return;
    
    if (newValue !== undefined) {
        item.quantity = parseInt(newValue) || 1;
    } else {
        item.quantity = Math.max(1, item.quantity + change);
    }
    
    localStorage.setItem('basket', JSON.stringify(basket));
    loadBasket();
    updateBasketCount();
}

// Remove from Basket
async function removeFromBasket(productId) {
    basket = basket.filter(item => item.id != productId);
    localStorage.setItem('basket', JSON.stringify(basket));
    loadBasket();
    updateBasketCount();
    showNotification('Item removed from Basket');
}

// Update Basket summary
function updateBasketSummary() {
    const basketSummary = document.getElementById('basketSummary');
    if (!basketSummary) return;
    
    const subtotal = basket.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const shipping = subtotal > 35 ? 0 : 5.99;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;
    
    basketSummary.innerHTML = `
        <h2>Order Summary</h2>
        <div class="summary-row">
            <span>Subtotal (${basket.reduce((sum, item) => sum + (item.quantity || 0), 0)} items):</span>
            <span>$${subtotal.toFixed(2)}</span>
        </div>
        <div class="summary-row">
            <span>Shipping:</span>
            <span>${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</span>
        </div>
        <div class="summary-row">
            <span>Tax:</span>
            <span>$${tax.toFixed(2)}</span>
        </div>
        <div class="summary-row summary-total">
            <span>Total:</span>
            <span>$${total.toFixed(2)}</span>
        </div>
        <button class="btn-checkout" onclick="window.location.href='checkout.html'">Proceed to Checkout</button>
    `;
}

// Search functionality
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value.trim() : '';
    
    if (query) {
        window.location.href = `search-results.html?q=${encodeURIComponent(query)}`;
    }
}

// Add CSS animation for notifications
const styleElement = document.createElement('style');
styleElement.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(styleElement);
