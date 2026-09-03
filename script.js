// ============================================
// Mbare Marketplace - Main JavaScript (Connected to Backend)
// ============================================

// Add warning message at the very beginning
console.log('%c WARNING: Unauthorized access to this console is prohibited by Mbare Marketplace CEO, Tonderai Wellington Nyamandi. This activity is illegal and will be prosecuted.', 
    'background: #232f3e; color: #ff9900; font-size: 14px; font-weight: bold; padding: 10px; border-radius: 5px;');

// Product Data - Will be loaded from API
let products = [];
let sellersMap = {};
let ratingsCache = {};

// Website URL constant
const WEBSITE_URL = 'https://www.mbaremarketplace.com';

// ============================================
// CATEGORY MAPPINGS
// ============================================

const CATEGORY_MATCHES = {
    'Electronic Devices': ['Electronic Devices', 'Electronics', 'Electronic', 'Gadgets', 'Tech', 'Computers', 'Phones'],
    'Clothing': ['Clothing', 'Fashion', 'Apparel', 'Clothes', 'Wear', 'Shirt', 'Dress', 'Jeans', 'Shoes'],
    'Books': ['Books', 'Book', 'Literature', 'Magazine', 'Textbook', 'Novel'],
    'Pet Supplies': ['Pet Supplies', 'Pets', 'Pet Food', 'Pet Accessories', 'Dog', 'Cat', 'Bird', 'Fish'],
    'Pets & Livestock': ['Pets & Livestock', 'Pets', 'Livestock', 'Cattle', 'Goats', 'Sheep', 'Chickens', 'Dogs', 'Cats', 'Rabbits', 'Horses', 'Animals'],
    'Farm Products': ['Farm Products', 'Farming', 'Agricultural', 'Farm', 'Crops', 'Livestock', 'Vegetables', 'Fruits', 'Seeds', 'Fertilizer'],
    'Vehicle Parts & Accessories': ['Vehicle Parts & Accessories', 'Auto Parts', 'Car Parts', 'Vehicle Parts', 'Accessories', 'Spare Parts', 'Tires', 'Batteries'],
    'Vehicles & Transportation': ['Vehicles & Transportation', 'Vehicles', 'Cars', 'Transportation', 'Trucks', 'Motorcycles', 'Bikes', 'Vans'],
    'Home & Kitchen': ['Home & Kitchen', 'Home', 'Kitchen', 'Home Decor', 'Furniture', 'Cookware', 'Appliances', 'Bedding'],
    'Beauty & Cosmetics': ['Beauty & Cosmetics', 'Beauty', 'Cosmetics', 'Makeup', 'Skincare', 'Hair Care', 'Perfume', 'Lotion', 'Cream', 'Lipstick'],
    'Hardware': ['Hardware', 'Steel', 'Wood', 'Poles', 'locks', 'keys', 'Bricks', 'Tools', 'Building'],
};

// ============================================
// FUNCTION DEFINITIONS
// ============================================

async function loadProductsByCategory(category, containerId, limit = 6) {
    try {
        console.log('Loading ' + category + ' products...');
        
        const possibleCategories = CATEGORY_MATCHES[category] || [category];
        
        const filteredProducts = products.filter(p => 
            possibleCategories.some(cat => 
                p.category && p.category.toLowerCase().includes(cat.toLowerCase())
            )
        );
        
        console.log('Found ' + filteredProducts.length + ' products for ' + category);
        
        const topProducts = filteredProducts.slice(0, limit);
        if (document.getElementById(containerId)) {
            await loadProductsWithRatings(containerId, topProducts);
        } else {
            console.warn('Container not found: ' + containerId);
        }
    } catch (error) {
        console.error('Error loading ' + category + ':', error);
    }
}

async function loadProductsWithRatings(containerId, productList) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn('Container not found: ' + containerId);
        return;
    }
    
    if (!productList || productList.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px;">No products available in this category.</p>';
        return;
    }
    
    container.innerHTML = '';
    
    productList.forEach(product => {
        const productCard = createProductCard(product);
        container.appendChild(productCard);
    });
    
    await fetchRatingsForProducts(productList);
}

async function fetchRatingsForProducts(productList) {
    for (const product of productList) {
        if (product.seller_id) {
            try {
                const ratingInfo = await getSellerRatings(product.seller_id);
                const ratingElement = document.getElementById('rating-' + product.id);
                if (ratingElement) {
                    ratingElement.innerHTML = ratingInfo.display;
                }
            } catch (error) {
                console.warn('Failed to fetch rating for product ' + product.id + ':', error);
                const ratingElement = document.getElementById('rating-' + product.id);
                if (ratingElement) {
                    ratingElement.innerHTML = '<span style="color: #999;">Rating unavailable</span>';
                }
            }
        }
    }
}

async function loadBestSellersElectronics() {
    await loadProductsByCategory('Electronic Devices', 'bestSellersElectronics', 6);
}

async function loadBestSellersClothing() {
    await loadProductsByCategory('Clothing', 'bestSellersClothing', 6);
}

async function loadBestSellersPetSupplies() {
    await loadProductsByCategory('Pet Supplies', 'bestSellersPetSupplies', 6);
}

async function loadBestSellersPetsLivestock() {
    await loadProductsByCategory('Pets & Livestock', 'bestSellersPetsLivestock', 6);
}

async function loadBestSellersFarmProducts() {
    await loadProductsByCategory('Farm Products', 'bestSellersFarmProducts', 6);
}

async function loadBestSellersVehicleParts() {
    await loadProductsByCategory('Vehicle Parts & Accessories', 'bestSellersVehicleParts&Accessories', 6);
}

async function loadBestSellersVehicles() {
    await loadProductsByCategory('Vehicles & Transportation', 'bestSellersVehicle&Transportation', 6);
}

async function loadBestSellersHomeKitchen() {
    await loadProductsByCategory('Home & Kitchen', 'bestSellersHome&Kitchen', 6);
}

async function loadBestSellersBeautyCosmetics() {
    await loadProductsByCategory('Beauty & Cosmetics', 'bestSellersBeautyCosmetics', 6);
}

async function loadBestSellersHardwareProducts() {
    await loadProductsByCategory('Hardware', 'bestSellersHardware', 6);
}       

async function loadTodaysDeals() {
    try {
        console.log('Loading Today\'s Deals...');
        if (document.getElementById('todaysDeals')) {
            const deals = products.slice(0, 5);
            await loadProductsWithRatings('todaysDeals', deals);
        }
    } catch (error) {
        console.error('Error loading deals:', error);
    }
}

async function loadRecommendedProducts() {
    try {
        console.log('Loading Recommended products...');
        if (document.getElementById('recommended')) {
            const recommended = products.slice(8, 16);
            await loadProductsWithRatings('recommended', recommended);
        }
    } catch (error) {
        console.error('Error loading recommendations:', error);
    }
}

async function loadAllProductsSection() {
    try {
        console.log('Loading All products...');
        if (document.getElementById('allProducts')) {
            await loadProductsWithRatings('allProducts', products);
        }
    } catch (error) {
        console.error('Error loading all products:', error);
    }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('DOM loaded, initializing...');
        
        if (!window.api) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        await loadSellersFromAPI();
        console.log('Sellers loaded:', Object.keys(sellersMap).length);
        
        await loadProductsFromAPI();
        console.log('Products loaded:', products.length);
        console.log('Product categories:', [...new Set(products.map(p => p.category))]);
        
        await loadUserBasket();
        
        await loadTodaysDeals();
        await loadBestSellersElectronics();
        await loadBestSellersClothing();
        await loadBestSellersPetSupplies();
        await loadBestSellersPetsLivestock();
        await loadBestSellersFarmProducts();
        await loadBestSellersHardwareProducts();
        await loadBestSellersVehicleParts();
        await loadBestSellersVehicles();
        await loadBestSellersHomeKitchen();
        await loadBestSellersBeautyCosmetics();
        await loadRecommendedProducts();
        await loadAllProductsSection();
        
        if (document.getElementById('productDetail')) {
            await loadProductDetail();
        }
        
        if (document.getElementById('basketItems')) {
            await loadBasketPage();
        }
        
        if (document.getElementById('carouselSlides')) {
            setInterval(() => {
                moveCarousel(1);
            }, 5000);
        }
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleSearch();
                }
            });
        }
        
        console.log('Initialization complete!');
        
    } catch (error) {
        console.error('Initialization error:', error);
        loadFallbackProducts();
    }
});

// ============================================
// API LOADING FUNCTIONS
// ============================================

async function loadSellersFromAPI() {
    try {
        const response = await fetch(window.SUPABASE_URL + '/rest/v1/sellers?select=*', {
            headers: {
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + window.SUPABASE_ANON_KEY
            }
        });
        
        if (!response.ok) return;
        
        const sellers = await response.json();
        
        if (Array.isArray(sellers) && sellers.length > 0) {
            sellers.forEach(seller => {
                sellersMap[seller.user_id] = seller;
            });
        }
    } catch (error) {
        console.error('Error loading sellers:', error);
    }
}

async function loadProductsFromAPI() {
    try {
        const response = await fetch(window.SUPABASE_URL + '/rest/v1/products?select=*&order=created_at.desc', {
            headers: {
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + window.SUPABASE_ANON_KEY
            }
        });
        
        const data = await response.json();
        
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
        }
    } catch (error) {
        console.error('Error loading products:', error);
        throw error;
    }
}

async function loadUserBasket() {
    try {
        const sessionData = localStorage.getItem('supabase_session');
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        
        if (isLoggedIn && sessionData) {
            const session = JSON.parse(sessionData);
            const userId = session.user?.id;
            
            if (userId) {
                const basketKey = 'basket_' + userId;
                const userBasket = JSON.parse(localStorage.getItem(basketKey)) || [];
                updateBasketCount(userBasket.reduce((sum, item) => sum + (item.quantity || 0), 0));
            } else {
                updateBasketCount(0);
            }
        } else {
            updateBasketCount(0);
        }
    } catch (error) {
        updateBasketCount(0);
    }
}

function loadFallbackProducts() {
    products = [
        {
            id: 1,
            title: "Wireless Bluetooth Headphones",
            price: 79.99,
            rating: 4.5,
            reviews: 1234,
            image: "https://via.placeholder.com/300x300?text=Headphones",
            category: "Electronics",
            description: "Premium wireless headphones...",
            features: ["Noise Cancellation", "30-hour battery"],
            seller_id: null
        },
        {
            id: 2,
            title: "Smart Watch",
            price: 199.99,
            rating: 4.7,
            reviews: 2567,
            image: "https://via.placeholder.com/300x300?text=Smart+Watch",
            category: "Electronics",
            description: "Advanced smartwatch...",
            features: ["Heart rate monitor", "GPS tracking"],
            seller_id: null
        },
        {
            id: 3,
            title: "Casual T-Shirt",
            price: 24.99,
            rating: 4.3,
            reviews: 89,
            image: "https://via.placeholder.com/300x300?text=T-Shirt",
            category: "Clothing",
            description: "Comfortable cotton t-shirt",
            features: ["100% Cotton", "Breathable"],
            seller_id: null
        }
    ];
    
    if (document.getElementById('todaysDeals')) {
        loadProductsWithRatings('todaysDeals', products.slice(0, 2));
    }
    if (document.getElementById('bestSellersElectronics')) {
        loadProductsWithRatings('bestSellersElectronics', products);
    }
    if (document.getElementById('allProducts')) {
        loadProductsWithRatings('allProducts', products);
    }
}

// ============================================
// RATING FUNCTIONS
// ============================================

async function getSellerRatings(sellerId) {
    if (ratingsCache[sellerId]) {
        return ratingsCache[sellerId];
    }
    
    try {
        const response = await fetch(window.SUPABASE_URL + '/rest/v1/ratings?seller_id=eq.' + sellerId + '&select=rating', {
            headers: {
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + window.SUPABASE_ANON_KEY
            }
        });
        
        const ratings = await response.json();
        
        let result;
        if (ratings && ratings.length > 0) {
            const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
            const average = sum / ratings.length;
            result = {
                average: average,
                count: ratings.length,
                stars: generateRatingStars(average),
                display: '<span style="color: #f90;">' + generateRatingStars(average) + '</span> <span style="color: #666; margin-left: 5px;">(' + ratings.length + ' ' + (ratings.length === 1 ? 'rating' : 'ratings') + ')</span>'
            };
        } else {
            result = {
                average: 0,
                count: 0,
                stars: '.....',
                display: '<span style="color: #999;">No ratings yet</span>'
            };
        }
        
        ratingsCache[sellerId] = result;
        return result;
    } catch (error) {
        return {
            average: 0,
            count: 0,
            stars: '.....',
            display: '<span style="color: #999;">No ratings yet</span>'
        };
    }
}

function generateRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '★';
    }
    if (hasHalfStar) {
        stars += '½';
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        stars += '☆';
    }
    return stars;
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let starsHTML = '';
    
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '★';
    }
    
    if (hasHalfStar) {
        starsHTML += '½';
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '☆';
    }
    
    return starsHTML;
}

// ============================================
// PRODUCT DISPLAY FUNCTIONS
// ============================================

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const stars = generateStars(product.rating);
    const seller = product.seller || sellersMap[product.seller_id] || {};
    const sellerName = seller.business_name || 'Unknown Seller';
    const imageUrl = product.image_url || product.image || 'https://via.placeholder.com/300x300?text=Product';
    
    card.innerHTML = `
        <img src="${imageUrl}" alt="${product.title}" class="product-image" onclick="checkLoginAndNavigate('${product.id}')" style="cursor: pointer;" onerror="this.src='https://via.placeholder.com/300x300?text=Product'">
        <h3 class="product-title" onclick="checkLoginAndNavigate('${product.id}')" style="cursor: pointer;">${escapeHtml(product.title)}</h3>
        <div class="product-rating">
            <span class="stars">${stars}</span>
            <span class="rating-count">(${product.reviews})</span>
        </div>
        <div class="product-price">
            <span class="currency">$</span>${product.price.toFixed(2)}
        </div>
        <a href="shop.html?seller=${product.seller_id}" class="visit-shop-link" onclick="event.stopPropagation()" style="color:#f90;text-decoration:underline;font-size:12px;display:inline-block;margin:5px 0;">Visit Shop</a>
        <div class="product-seller" style="font-size: 12px; color: #666; margin: 5px 0;">
            Seller: ${escapeHtml(sellerName)}
        </div>
        <div class="seller-rating" id="rating-${product.id}" style="font-size: 12px; margin: 5px 0; min-height: 20px;">
            <span style="color: #999;">Loading ratings...</span>
        </div>
        <div class="product-actions">
            <button class="btn-add-cart" onclick="addToBasket('${product.id}')">Add to Basket</button>
            <button class="btn-contact-seller" onclick="showSellerContact('${product.id}')" style="background: #f90; color: white; border: none; padding: 8px; border-radius: 4px; margin-top: 5px; width: 100%; cursor: pointer; font-weight: 600;">Contact Seller</button>
        </div>
    `;
    
    return card;
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
}

// ============================================
// CONTACT SELLER - WITH CHOICE MODAL (UPDATED)
// ============================================

async function showSellerContact(productId) {
    const sessionData = localStorage.getItem('supabase_session');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (!isLoggedIn || !sessionData) {
        const confirmLogin = confirm('Please login to contact the seller. Would you like to login now?');
        if (confirmLogin) {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        }
        return;
    }
    
    try {
        const session = JSON.parse(sessionData);
        const userId = session.user?.id;
        const accessToken = session.access_token;
        
        if (!userId) {
            alert('User session error. Please login again.');
            return;
        }
        
        // Get product info
        const product = products.find(p => p.id == productId);
        if (!product) {
            alert('Product not found');
            return;
        }
        
        const sellerId = product.seller_id;
        const productName = product.title;
        const productPrice = product.price;
        const productImage = product.image_url || product.image || 'https://via.placeholder.com/70x70?text=Product';
        
        if (!sellerId) {
            alert('Seller information not available');
            return;
        }
        
        // Get seller's business name and phone
        const seller = sellersMap[sellerId];
        const sellerName = seller?.business_name || 'Seller';
        const sellerPhone = seller?.business_phone || '';
        
        // Store product data for later use
        const productData = {
            id: product.id,
            title: productName,
            price: productPrice,
            image: productImage,
            image_url: productImage,
            seller_id: sellerId,
            seller_name: sellerName,
            seller_phone: sellerPhone
        };
        
        localStorage.setItem('pending_product', JSON.stringify(productData));
        sessionStorage.setItem('pending_product', JSON.stringify(productData));
        
        // SHOW CHOICE MODAL instead of going directly to messages
        showContactChoiceModal(productData);
        
    } catch (error) {
        console.error('Error in showSellerContact:', error);
        alert('Could not start conversation. Please try again.');
    }
}

// ============================================
// CONTACT CHOICE MODAL
// ============================================

function showContactChoiceModal(productData) {
    // Check if modal already exists
    let modal = document.getElementById('contactChoiceModal');
    
    if (!modal) {
        // Create modal
        modal = document.createElement('div');
        modal.id = 'contactChoiceModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 30000;
            padding: 20px;
            animation: fadeIn 0.3s ease;
        `;
        
        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 20px;
                max-width: 450px;
                width: 100%;
                padding: 35px 30px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                animation: slideUp 0.3s ease;
                position: relative;
            ">
                <button onclick="closeContactChoiceModal()" style="
                    position: absolute;
                    top: 15px;
                    right: 20px;
                    background: none;
                    border: none;
                    font-size: 28px;
                    cursor: pointer;
                    color: #999;
                ">✕</button>
                
                <div style="text-align: center; margin-bottom: 25px;">
                    <div style="
                        width: 70px;
                        height: 70px;
                        background: #f0f7ff;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 15px;
                        font-size: 30px;
                    ">💬</div>
                    <h2 style="color: #232f3e; font-size: 22px; margin: 0 0 8px 0;">Contact Seller</h2>
                    <p style="color: #666; margin: 0; font-size: 14px;">Choose how you'd like to communicate with <strong>${escapeHtml(productData.seller_name)}</strong></p>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <!-- Mbare Messenger Option -->
                    <button onclick="chooseMbareMessenger()" style="
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        padding: 16px 20px;
                        border: 2px solid #232f3e;
                        border-radius: 12px;
                        background: white;
                        cursor: pointer;
                        transition: all 0.2s;
                        width: 100%;
                        text-align: left;
                    " onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
                        <div style="
                            width: 44px;
                            height: 44px;
                            background: #232f3e;
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: 700;
                            font-size: 14px;
                            flex-shrink: 0;
                        ">MB</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #232f3e; font-size: 16px;">Mbare Messenger</div>
                            <div style="color: #666; font-size: 13px;">Chat directly on our platform</div>
                        </div>
                        <div style="color: #232f3e; font-size: 20px;">→</div>
                    </button>
                    
                    <!-- WhatsApp Option -->
                    <button onclick="chooseWhatsApp()" style="
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        padding: 16px 20px;
                        border: 2px solid #25D366;
                        border-radius: 12px;
                        background: white;
                        cursor: pointer;
                        transition: all 0.2s;
                        width: 100%;
                        text-align: left;
                    " onmouseover="this.style.background='#f0faf4'" onmouseout="this.style.background='white'">
                        <div style="
                            width: 44px;
                            height: 44px;
                            background: #25D366;
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: 700;
                            font-size: 22px;
                            flex-shrink: 0;
                        ">💬</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #25D366; font-size: 16px;">WhatsApp</div>
                            <div style="color: #666; font-size: 13px;">Chat via WhatsApp (external)</div>
                        </div>
                        <div style="color: #25D366; font-size: 20px;">→</div>
                    </button>
                </div>
                
                <div style="margin-top: 20px; text-align: center;">
                    <button onclick="closeContactChoiceModal()" style="
                        background: none;
                        border: none;
                        color: #999;
                        font-size: 13px;
                        cursor: pointer;
                        text-decoration: underline;
                    ">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    // Store product data for the choice handlers
    window._pendingContactProduct = productData;
    
    // Show modal
    modal.style.display = 'flex';
}

// ============================================
// CONTACT CHOICE HANDLERS
// ============================================

// Handle Mbare Messenger choice
window.chooseMbareMessenger = async function() {
    const productData = window._pendingContactProduct;
    if (!productData) {
        alert('Product data not found. Please try again.');
        return;
    }
    
    closeContactChoiceModal();
    
    try {
        const sessionData = localStorage.getItem('supabase_session');
        const session = JSON.parse(sessionData);
        const userId = session.user?.id;
        const accessToken = session.access_token;
        
        // Create conversation for Mbare Messenger
        const initialMessage = 'Hi, I am interested in your product: ' + productData.title + ' ($' + productData.price.toFixed(2) + ')\n\nQuantity: 1.0';
        
        // Check if conversation exists
        let existingConv = null;
        try {
            const convResponse = await fetch(window.SUPABASE_URL + '/rest/v1/conversations?buyer_id=eq.' + userId + '&seller_id=eq.' + productData.seller_id + '&select=id', {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': 'Bearer ' + accessToken
                }
            });
            const convData = await convResponse.json();
            if (convData && convData.length > 0) {
                existingConv = convData[0];
            }
        } catch (e) {
            console.log('Check existing conversation error:', e);
        }
        
        let conversationId = existingConv?.id;
        
        if (!conversationId) {
            const convData = {
                product_id: productData.id,
                buyer_id: userId,
                seller_id: productData.seller_id,
                subject: productData.seller_name,
                last_message: initialMessage,
                last_message_at: new Date().toISOString(),
                unread_buyer: 0,
                unread_seller: 1
            };
            
            const createResponse = await fetch(window.SUPABASE_URL + '/rest/v1/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': 'Bearer ' + accessToken,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(convData)
            });
            
            if (createResponse.ok) {
                const result = await createResponse.json();
                if (result && result.length > 0) {
                    conversationId = result[0].id;
                    
                    await fetch(window.SUPABASE_URL + '/rest/v1/messages', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': window.SUPABASE_ANON_KEY,
                            'Authorization': 'Bearer ' + accessToken,
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({
                            conversation_id: conversationId,
                            sender_id: userId,
                            message: initialMessage,
                            created_at: new Date().toISOString()
                        })
                    });
                }
            }
        }
        
        // Redirect to messages
        if (conversationId) {
            window.location.href = 'messages.html?conversation=' + conversationId + '&product=' + productData.id;
        } else {
            window.location.href = 'messages.html?product=' + productData.id;
        }
        
    } catch (error) {
        console.error('Error creating conversation:', error);
        alert('Could not start conversation. Please try again.');
    }
};

// Handle WhatsApp choice
window.chooseWhatsApp = function() {
    const productData = window._pendingContactProduct;
    if (!productData) {
        alert('Product data not found. Please try again.');
        return;
    }
    
    closeContactChoiceModal();
    
    const sellerPhone = productData.seller_phone;
    if (!sellerPhone) {
        alert('Seller phone number not available for WhatsApp contact.');
        return;
    }
    
    // Format phone number
    let phone = sellerPhone.toString().replace(/\D/g, '');
    if (phone.startsWith('0')) phone = phone.substring(1);
    if (!phone.startsWith('263')) phone = '263' + phone;
    
    // Get buyer info
    let buyerInfo = '';
    const sessionData = localStorage.getItem('supabase_session');
    if (sessionData) {
        try {
            const session = JSON.parse(sessionData);
            const userEmail = session.user?.email;
            if (userEmail) {
                buyerInfo = `\nBuyer email: ${userEmail}`;
            }
        } catch(e) {}
    }
    
    const websiteUrl = 'https://www.mbaremarketplace.com';
    const message = `Hello! I am interested in ${productData.title}, I saw it on ${websiteUrl}${buyerInfo}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappLink = `https://wa.me/${phone}?text=${encodedMessage}`;
    
    // Track WhatsApp click
    if (window.recordAppDownload) {
        window.recordAppDownload('whatsapp_contact', { 
            product_id: productData.id,
            seller_id: productData.seller_id
        });
    }
    
    // Open WhatsApp in new tab
    window.open(whatsappLink, '_blank');
    
    // Also log the conversation in Mbare Messenger for history
    logWhatsAppConversation(productData);
};

// Log WhatsApp conversation (optional - for history)
async function logWhatsAppConversation(productData) {
    try {
        const sessionData = localStorage.getItem('supabase_session');
        const session = JSON.parse(sessionData);
        const userId = session.user?.id;
        const accessToken = session.access_token;
        
        // Create a conversation record with WhatsApp note
        const convData = {
            product_id: productData.id,
            buyer_id: userId,
            seller_id: productData.seller_id,
            subject: productData.seller_name + ' (WhatsApp)',
            last_message: 'Contacted via WhatsApp',
            last_message_at: new Date().toISOString(),
            unread_buyer: 0,
            unread_seller: 0,
            metadata: { contact_method: 'whatsapp' }
        };
        
        await fetch(window.SUPABASE_URL + '/rest/v1/conversations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + accessToken,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(convData)
        });
    } catch (e) {
        console.log('Could not log WhatsApp conversation:', e);
    }
}

// ============================================
// CLOSE MODAL
// ============================================

window.closeContactChoiceModal = function() {
    const modal = document.getElementById('contactChoiceModal');
    if (modal) {
        modal.style.display = 'none';
    }
    window._pendingContactProduct = null;
};

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('contactChoiceModal');
    if (modal && e.target === modal) {
        closeContactChoiceModal();
    }
});

// ============================================
// CSS ANIMATIONS (add to existing styles)
// ============================================

const contactModalStyles = document.createElement('style');
contactModalStyles.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes slideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
`;
document.head.appendChild(contactModalStyles);

// ============================================
// REMAINING FUNCTIONS
// ============================================

function checkLoginAndNavigate(productId) {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (!isLoggedIn) {
        let loginModal = document.getElementById('loginPromptModal');
        if (!loginModal) {
            const confirmLogin = confirm('Please login to view product details. Would you like to login now?');
            if (confirmLogin) {
                window.location.href = 'login.html?redirect=product-detail.html?id=' + productId;
            }
            return false;
        }
        loginModal.style.display = 'flex';
        window.pendingProductId = productId;
        return false;
    }
    
    window.location.href = 'product-detail.html?id=' + productId;
    return true;
}

function showLoginPrompt() {
    document.getElementById('loginPromptModal').style.display = 'flex';
}

function hideLoginPrompt() {
    document.getElementById('loginPromptModal').style.display = 'none';
}

async function addToBasket(productId, quantity = 1) {
    try {
        const sessionData = localStorage.getItem('supabase_session');
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        
        if (!isLoggedIn || !sessionData) {
            showNotification('Please login to add items to basket');
            setTimeout(() => {
                window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
            }, 1500);
            return;
        }
        
        const session = JSON.parse(sessionData);
        const userId = session.user?.id;
        if (!userId) {
            showNotification('User session error. Please login again.');
            return;
        }
        
        const product = products.find(p => p.id == productId);
        if (!product) {
            showNotification('Product not found');
            return;
        }
        
        const basketKey = 'basket_' + userId;
        let userBasket = JSON.parse(localStorage.getItem(basketKey)) || [];
        const existingItem = userBasket.find(item => item.id == productId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            userBasket.push({
                id: product.id,
                title: product.title,
                price: product.price,
                image: product.image_url || product.image || 'https://via.placeholder.com/300x300?text=Product',
                quantity: quantity,
                seller_id: product.seller_id
            });
        }
        
        localStorage.setItem(basketKey, JSON.stringify(userBasket));
        const totalItems = userBasket.reduce((sum, item) => sum + (item.quantity || 0), 0);
        updateBasketCount(totalItems);
        showNotification('Item added to Basket!');
    } catch (error) {
        showNotification('Failed to add item to basket');
    }
}

function updateBasketCount(totalItems) {
    const basketCount = document.getElementById('basketCount');
    if (!basketCount) return;
    
    if (totalItems !== undefined) {
        basketCount.textContent = totalItems;
        basketCount.style.display = totalItems > 0 ? 'flex' : 'none';
    } else {
        try {
            const sessionData = localStorage.getItem('supabase_session');
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            if (isLoggedIn && sessionData) {
                const session = JSON.parse(sessionData);
                const userId = session.user?.id;
                if (userId) {
                    const basketKey = 'basket_' + userId;
                    const userBasket = JSON.parse(localStorage.getItem(basketKey)) || [];
                    const items = userBasket.reduce((sum, item) => sum + (item.quantity || 0), 0);
                    basketCount.textContent = items;
                    basketCount.style.display = items > 0 ? 'flex' : 'none';
                    return;
                }
            }
            basketCount.textContent = '0';
            basketCount.style.display = 'none';
        } catch (error) {
            basketCount.textContent = '0';
            basketCount.style.display = 'none';
        }
    }
}

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

let currentSlide = 0;
const totalSlides = 3;

function moveCarousel(direction) {
    const slides = document.getElementById('carouselSlides');
    const indicators = document.querySelectorAll('.indicator');
    if (!slides) return;
    
    currentSlide += direction;
    if (currentSlide < 0) currentSlide = totalSlides - 1;
    else if (currentSlide >= totalSlides) currentSlide = 0;
    
    slides.style.transform = 'translateX(-' + (currentSlide * 100) + '%)';
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === currentSlide);
    });
}

function goToSlide(index) {
    currentSlide = index;
    moveCarousel(0);
}

async function loadProductDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    if (!productId) return;
    
    const product = products.find(p => p.id == productId);
    if (!product) return;
    
    let ratingInfo = null;
    if (product.seller_id) {
        ratingInfo = await getSellerRatings(product.seller_id);
    }
    displayProductDetail(product, ratingInfo);
}

function displayProductDetail(product, ratingInfo) {
    const stars = generateStars(product.rating || 4.0);
    const seller = sellersMap[product.seller_id] || {};
    const whatsappNumber = seller.business_phone || '';
    const shopLocation = seller.business_address || 'Location not specified';
    const ratingDisplay = ratingInfo ? ratingInfo.display : '<span style="color: #999;">No ratings yet</span>';
    const whatsappMessage = 'Hello! I am interested in ' + product.title + ', I saw it on ' + WEBSITE_URL;
    const encodedMessage = encodeURIComponent(whatsappMessage);
    const formattedWhatsappNumber = whatsappNumber ? whatsappNumber.replace(/[^0-9]/g, '') : '';
    const whatsappLink = formattedWhatsappNumber ? 'https://wa.me/' + formattedWhatsappNumber + '?text=' + encodedMessage : '#';
    
    const detailContainer = document.getElementById('productDetail');
    if (!detailContainer) return;
    
    detailContainer.innerHTML = `
        <div class="product-detail-image-container">
            <img src="${product.image_url || product.image}" alt="${product.title}" class="product-detail-image" id="productMainImage" onerror="this.src='https://via.placeholder.com/500x500?text=Product'">
        </div>
        <div class="product-detail-info">
            <h1>${escapeHtml(product.title)}</h1>
            <div class="product-detail-rating">
                <span class="stars">${stars}</span>
                <span class="rating-count">${product.reviews || 0} ratings</span>
            </div>
            <div class="product-detail-price">$${product.price.toFixed(2)}</div>
            <p class="product-detail-description">${escapeHtml(product.description || '')}</p>
            <div class="detail-actions">
                <button class="btn-add-cart-large" onclick="addToBasket('${product.id}')">Add to Basket</button>
                ${whatsappNumber ? '<a href="' + whatsappLink + '" target="_blank" class="btn-buy-now-large" style="display: inline-block; text-decoration: none; background: #25D366; color: white; padding: 12px 30px; border-radius: 4px;">Buy via WhatsApp</a>' : ''}
            </div>
        </div>
    `;
}

async function buyNow(productId) {
    await addToBasket(productId, 1);
    setTimeout(() => window.location.href = 'checkout.html', 500);
}

async function loadBasketPage() {
    const basketItemsContainer = document.getElementById('basketItems');
    if (!basketItemsContainer) return;
    
    const sessionData = localStorage.getItem('supabase_session');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (!isLoggedIn || !sessionData) {
        basketItemsContainer.innerHTML = '<p style="text-align: center; padding: 40px;">Please <a href="login.html?redirect=Basket.html">login</a> to view your basket.</p>';
        return;
    }
    
    const session = JSON.parse(sessionData);
    const userId = session.user?.id;
    if (!userId) return;
    
    const basketKey = 'basket_' + userId;
    const userBasket = JSON.parse(localStorage.getItem(basketKey)) || [];
    
    if (userBasket.length === 0) {
        basketItemsContainer.innerHTML = '<p style="text-align: center; padding: 40px;">Your Basket is empty. <a href="index.html">Start Shopping</a></p>';
        return;
    }
    
    basketItemsContainer.innerHTML = '';
    let subtotal = 0;
    
    for (const item of userBasket) {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        const basketItem = document.createElement('div');
        basketItem.className = 'basket-item';
        basketItem.innerHTML = `
            <img src="${item.image}" alt="${item.title}" style="width: 100px;">
            <div><a href="product-detail.html?id=${item.id}">${escapeHtml(item.title)}</a></div>
            <div>$${item.price.toFixed(2)}</div>
            <div>Quantity: ${item.quantity}</div>
            <div>Total: $${itemTotal.toFixed(2)}</div>
            <button onclick="removeFromBasket('${item.id}')">Remove</button>
        `;
        basketItemsContainer.appendChild(basketItem);
    }
    
    const basketSummary = document.getElementById('basketSummary');
    if (basketSummary) {
        basketSummary.innerHTML = '<h3>Total: $' + subtotal.toFixed(2) + '</h3><button onclick="window.location.href=\'checkout.html\'">Checkout</button>';
    }
}

async function updateBasketQuantity(productId, change, newValue) {
    const sessionData = localStorage.getItem('supabase_session');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn || !sessionData) {
        window.location.href = 'login.html?redirect=Basket.html';
        return;
    }
    const session = JSON.parse(sessionData);
    const userId = session.user?.id;
    if (!userId) return;
    
    const basketKey = 'basket_' + userId;
    let userBasket = JSON.parse(localStorage.getItem(basketKey)) || [];
    const item = userBasket.find(i => i.id == productId);
    if (!item) return;
    
    if (newValue !== undefined) {
        item.quantity = parseInt(newValue) || 1;
    } else {
        item.quantity = Math.max(1, item.quantity + change);
    }
    localStorage.setItem(basketKey, JSON.stringify(userBasket));
    loadBasketPage();
}

async function removeFromBasket(productId) {
    const sessionData = localStorage.getItem('supabase_session');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn || !sessionData) {
        window.location.href = 'login.html?redirect=Basket.html';
        return;
    }
    const session = JSON.parse(sessionData);
    const userId = session.user?.id;
    if (!userId) return;
    
    const basketKey = 'basket_' + userId;
    let userBasket = JSON.parse(localStorage.getItem(basketKey)) || [];
    userBasket = userBasket.filter(item => item.id != productId);
    localStorage.setItem(basketKey, JSON.stringify(userBasket));
    loadBasketPage();
    showNotification('Item removed from Basket');
}

function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value.trim() : '';
    if (query) {
        window.location.href = 'search-results.html?q=' + encodeURIComponent(query);
    }
}

const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(styleSheet);

// ============================================
// EXPOSE FUNCTIONS TO GLOBAL WINDOW OBJECT
// ============================================
window.checkLoginAndNavigate = checkLoginAndNavigate;
window.goToProductDetail = checkLoginAndNavigate;
window.addToBasket = addToBasket;
window.showSellerContact = showSellerContact;
window.removeFromBasket = removeFromBasket;
window.updateBasketQuantity = updateBasketQuantity;
window.buyNow = buyNow;
window.logout = function() {
    localStorage.removeItem('supabase_session');
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'index.html';
};
window.showLoginPrompt = showLoginPrompt;
window.hideLoginPrompt = hideLoginPrompt;
window.moveCarousel = moveCarousel;
window.goToSlide = goToSlide;
window.handleSearch = handleSearch;
window.chooseMbareMessenger = chooseMbareMessenger;
window.chooseWhatsApp = chooseWhatsApp;
window.closeContactChoiceModal = closeContactChoiceModal;

// ============================================
// PASSWORD RESET DETECTION
// ============================================

(function() {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
        console.log('Password reset token detected, redirecting to reset-password.html');
        window.location.href = '/reset-password.html' + hash;
    }
})();

console.log('script.js loaded successfully!');
