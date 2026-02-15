// ============================================
// Mbare Marketplace - Main JavaScript (Connected to Backend)
// ============================================

// Product Data - Will be loaded from API
let products = [];
let basket = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // ADD THIS CHECK FOR API
        if (!window.api) {
            console.log('Waiting for API to load...');
            // Wait a moment for API to load
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
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
// Load products from API
async function loadProductsFromAPI() {
    try {
        // ADD THIS CHECK AT THE BEGINNING
        if (!window.api || typeof window.api.getProducts !== 'function') {
            console.log('API or getProducts not ready yet');
            throw new Error('API not ready');
        }
        
        const response = await api.getProducts({ limit: 50 });
        if (response.success && response.products) {
            products = response.products.map(p => ({
                id: p.id,
                title: p.title,
                price: parseFloat(p.price),
                rating: parseFloat(p.rating) || 0,
                reviews: p.reviews || 0,
                image: p.image,
                category: p.category,
                description: p.description,
                features: p.features || []
            }));
        }
    } catch (error) {
        console.error('Failed to load products from API:', error);
        // Will use fallback products
        throw error;
    }
}
// Load basket from API (if user is logged in)
async function loadBasketFromAPI() {
    try {
        if (api.token) {
            const response = await api.getBasket();
            if (response.success && response.basket) {
                basket = response.basket.map(item => ({
                    id: item.product,
                    product: item.product,
                    title: item.title,
                    price: parseFloat(item.price),
                    image: item.image,
                    quantity: item.quantity
                }));
                updateBasketCount();
            }
        } else {
            // Load from localStorage if not logged in
            basket = JSON.parse(localStorage.getItem('basket')) || [];
            updateBasketCount();
        }
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
    const card = document.createElement('a');
    card.href = `product-detail.html?id=${product.id}`;
    card.className = 'product-card';
    
    const stars = generateStars(product.rating);
    
    card.innerHTML = `
        <img src="${product.image}" alt="${product.title}" class="product-image" onerror="this.src='https://via.placeholder.com/300x300?text=Product'">
        <h3 class="product-title">${product.title}</h3>
        <div class="product-rating">
            <span class="stars">${stars}</span>
            <span class="rating-count">(${product.reviews})</span>
        </div>
        <div class="product-price">
            <span class="currency">$</span>${product.price.toFixed(2)}
        </div>
        <div class="product-prime">FREE delivery</div>
        <div class="product-actions">
            <button class="btn-add-cart" onclick="event.preventDefault(); addToBasket('${product.id}')">Add to Basket</button>
            <button class="btn-buy-now" onclick="event.preventDefault(); buyNow('${product.id}')">Buy Now</button>
        </div>
    `;
    
    return card;
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

// Add to Basket (with API integration)
async function addToBasket(productId, quantity = 1) {
    try {
        if (api.token) {
            // User is logged in - use API
            await api.addToBasket(productId, quantity);
            await loadBasketFromAPI();
            showNotification('Item added to Basket!');
        } else {
            // Not logged in - use localStorage
            const product = products.find(p => p.id === productId || p.id.toString() === productId);
            if (!product) {
                // Try to fetch from API
                try {
                    const response = await api.getProduct(productId);
                    if (response.success) {
                        const p = response.product;
                        const existingItem = basket.find(item => (item.id === productId || item.product === productId));
                        if (existingItem) {
                            existingItem.quantity += quantity;
                        } else {
                            basket.push({
                                id: p.id,
                                product: p.id,
                                title: p.title,
                                price: parseFloat(p.price),
                                image: p.image,
                                quantity: quantity
                            });
                        }
                    }
                } catch (error) {
                    showNotification('Product not found');
                    return;
                }
            } else {
                const existingItem = basket.find(item => (item.id === productId || item.id.toString() === productId));
                if (existingItem) {
                    existingItem.quantity += quantity;
                } else {
                    basket.push({
                        ...product,
                        product: product.id,
                        seller_id: product.seller?.id || product.seller_id,
                        seller: product.seller,
                        quantity: quantity
                    });
                }
            }
            
            localStorage.setItem('basket', JSON.stringify(basket));
            updateBasketCount();
            showNotification('Item added to Basket!');
        }
    } catch (error) {
        console.error('Error adding to basket:', error);
        showNotification('Failed to add item to basket');
    }
}

// Buy now
async function buyNow(productId) {
    await addToBasket(productId, 1);
    setTimeout(() => {
        window.location.href = 'checkout.html';
    }, 500);
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
    
    try {
        // Try to load from API
        const response = await api.getProduct(productId);
        if (response.success) {
            const product = response.product;
            // Store product for later use
            window.currentProduct = product;
            displayProductDetail(product);
            return;
        }
    } catch (error) {
        console.error('Failed to load product from API:', error);
    }
    
    // Fallback to local products
    const product = products.find(p => p.id === productId || p.id.toString() === productId);
    if (!product) {
        document.getElementById('productDetail').innerHTML = '<p>Product not found</p>';
        return;
    }
    
    displayProductDetail(product);
}

function displayProductDetail(product) {
    const stars = generateStars(product.rating || 0);
    const seller = product.seller || {};
    const whatsappNumber = product.seller_whatsapp || seller.whatsapp_number || '';
    const shopLocation = product.seller_location || seller.shop_location || {};
    const sellerRating = seller.seller_rating || 0;
    const sellerTotalRatings = seller.total_ratings || 0;
    
    // Format location
    const locationText = shopLocation.street || shopLocation.area || shopLocation.city 
        ? `${shopLocation.street || ''} ${shopLocation.area || ''} ${shopLocation.city || ''}`.trim()
        : 'Location not specified';
    
    document.getElementById('productDetail').innerHTML = `
        <div class="product-detail-image-container">
            <img src="${product.image}" alt="${product.title}" class="product-detail-image" id="productMainImage" onerror="this.src='https://via.placeholder.com/500x500?text=Product'">
        </div>
        <div class="product-detail-info">
            <h1>${product.title}</h1>
            <div class="product-detail-rating">
                <span class="stars">${stars}</span>
                <span class="rating-count">${product.reviews || 0} ratings</span>
            </div>
            <div class="product-detail-price">
                <span class="currency">$</span>${parseFloat(product.price).toFixed(2)}
            </div>
            <p class="product-detail-description">${product.description || ''}</p>
            <ul class="product-detail-features">
                ${(product.features || []).map(feature => `<li>${feature}</li>`).join('')}
            </ul>
            
            ${seller.name || seller.shop_name ? `
            <div style="margin: 30px 0; padding: 20px; background: #f5f5f5; border-radius: 4px;">
                <h3 style="margin-bottom: 15px; font-size: 18px;">Seller Information</h3>
                <p style="margin-bottom: 10px;"><strong>Shop:</strong> ${seller.shop_name || seller.name}</p>
                ${sellerRating > 0 ? `<p style="margin-bottom: 10px;"><strong>Seller Rating:</strong> ${generateStars(sellerRating)} (${sellerTotalRatings} reviews)</p>` : ''}
                ${locationText !== 'Location not specified' ? `<p style="margin-bottom: 10px;"><strong>📍 Location:</strong> ${locationText}</p>` : ''}
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

// Load Basket page
async function loadBasket() {
    const basketItemsContainer = document.getElementById('basketItems');
    const basketSummary = document.getElementById('basketSummary');
    
    if (!basketItemsContainer) return;
    
    try {
        // Load from API if logged in
        if (api.token) {
            const response = await api.getBasket();
            if (response.success) {
                basket = response.basket.map(item => ({
                    id: item.product,
                    product: item.product,
                    title: item.title,
                    price: parseFloat(item.price),
                    image: item.image,
                    quantity: item.quantity
                }));
            }
        } else {
            // Load from localStorage
            basket = JSON.parse(localStorage.getItem('basket')) || [];
        }
    } catch (error) {
        console.error('Failed to load basket:', error);
        basket = JSON.parse(localStorage.getItem('basket')) || [];
    }
    
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
                <a href="product-detail.html?id=${item.id || item.product}" class="basket-item-title">${item.title}</a>
                <div class="basket-item-price">$${parseFloat(item.price).toFixed(2)}</div>
                <div class="basket-item-actions">
                    <div class="quantity-selector">
                        <button class="quantity-btn" onclick="updateQuantity('${item.id || item.product}', -1)">-</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1" onchange="updateQuantity('${item.id || item.product}', 0, this.value)">
                        <button class="quantity-btn" onclick="updateQuantity('${item.id || item.product}', 1)">+</button>
                    </div>
                    <button class="remove-item" onclick="removeFromBasket('${item.id || item.product}')">Remove</button>
                </div>
            </div>
        `;
        basketItemsContainer.appendChild(basketItem);
    }
    
    updateBasketSummary();
}

// Update quantity
async function updateQuantity(productId, change, newValue) {
    try {
        const item = basket.find(i => (i.id === productId || i.id?.toString() === productId || i.product === productId));
        if (!item) return;
        
        if (newValue !== undefined) {
            item.quantity = parseInt(newValue) || 1;
        } else {
            item.quantity = Math.max(1, item.quantity + change);
        }
        
        if (api.token) {
            // Update via API
            await api.updateBasketItem(productId, item.quantity);
            await loadBasketFromAPI();
        } else {
            // Update localStorage
            localStorage.setItem('basket', JSON.stringify(basket));
        }
        
        loadBasket();
        updateBasketCount();
    } catch (error) {
        console.error('Error updating quantity:', error);
        showNotification('Failed to update quantity');
    }
}

// Remove from Basket
async function removeFromBasket(productId) {
    try {
        if (api.token) {
            await api.removeFromBasket(productId);
            await loadBasketFromAPI();
        } else {
            basket = basket.filter(item => 
                item.id !== productId && 
                item.id?.toString() !== productId && 
                item.product !== productId
            );
            localStorage.setItem('basket', JSON.stringify(basket));
        }
        
        loadBasket();
        updateBasketCount();
        showNotification('Item removed from Basket');
    } catch (error) {
        console.error('Error removing from basket:', error);
        showNotification('Failed to remove item');
    }
}

// Update Basket summary
function updateBasketSummary() {
    const basketSummary = document.getElementById('basketSummary');
    if (!basketSummary) return;
    
    const subtotal = basket.reduce((sum, item) => sum + (parseFloat(item.price) * (item.quantity || 1)), 0);
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

// Store current search results
let currentSearchResults = [];

// Load search results
async function loadSearchResults() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';
    
    if (query) {
        document.getElementById('searchQuery').textContent = `Results for "${query}"`;
        
        try {
            // Search via API
            const response = await api.getProducts({ search: query, limit: 50 });
            if (response.success && response.products) {
                currentSearchResults = response.products.map(p => ({
                    id: p.id,
                    title: p.title,
                    price: parseFloat(p.price),
                    rating: parseFloat(p.rating) || 0,
                    reviews: p.reviews || 0,
                    image: p.image,
                    category: p.category,
                    description: p.description,
                    features: p.features || []
                }));
                displaySearchResults(currentSearchResults);
                return;
            }
        } catch (error) {
            console.error('Search error:', error);
        }
        
        // Fallback to local search
        currentSearchResults = products.filter(product =>
            product.title.toLowerCase().includes(query.toLowerCase()) ||
            product.category.toLowerCase().includes(query.toLowerCase())
        );
    } else {
        currentSearchResults = [...products];
    }
    
    displaySearchResults(currentSearchResults);
}

// Display search results
function displaySearchResults(productList) {
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) {
        if (productList.length === 0) {
            resultsContainer.innerHTML = '<p style="text-align: center; padding: 40px;">No products found.</p>';
        } else {
            resultsContainer.innerHTML = '';
            productList.forEach(product => {
                const productCard = createProductCard(product);
                resultsContainer.appendChild(productCard);
            });
        }
    }
}

// Filter and sort products
function filterProducts() {
    const sortBy = document.getElementById('sortBy')?.value || 'relevance';
    const priceFilter = document.getElementById('priceFilter')?.value || 'all';
    
    let filtered = currentSearchResults.length > 0 ? [...currentSearchResults] : [...products];
    
    // Price filter
    if (priceFilter === 'under25') {
        filtered = filtered.filter(p => p.price < 25);
    } else if (priceFilter === '25to50') {
        filtered = filtered.filter(p => p.price >= 25 && p.price < 50);
    } else if (priceFilter === '50to100') {
        filtered = filtered.filter(p => p.price >= 50 && p.price < 100);
    } else if (priceFilter === 'over100') {
        filtered = filtered.filter(p => p.price >= 100);
    }
    
    // Sort
    if (sortBy === 'priceLow') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'priceHigh') {
        filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
        filtered.sort((a, b) => b.rating - a.rating);
    }
    
    return filtered;
}

// Initialize search results page
if (window.location.pathname.includes('search-results.html')) {
    document.addEventListener('DOMContentLoaded', async function() {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q') || '';
        const searchInput = document.getElementById('searchInput');
        if (searchInput && query) {
            searchInput.value = query;
        }
        
        await loadSearchResults();
        
        const sortBy = document.getElementById('sortBy');
        const priceFilter = document.getElementById('priceFilter');
        
        if (sortBy) {
            sortBy.addEventListener('change', function() {
                applyFilters();
            });
        }
        
        if (priceFilter) {
            priceFilter.addEventListener('change', function() {
                applyFilters();
            });
        }
    });
}

function applyFilters() {
    const filtered = filterProducts();
    displaySearchResults(filtered);
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
