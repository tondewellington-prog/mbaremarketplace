// auth-check.js

// ==================== LOGIN PROMPT MODAL ====================
// Inject the login prompt modal into the page
function injectLoginPrompt() {
    // Check if already injected
    if (document.getElementById('loginPromptModal')) return;
    
    const modalHTML = `
        <div id="loginPromptModal" class="login-prompt-overlay" style="display: none;">
            <div class="login-prompt-box">
                <h2>Login Required</h2>
                <p>You need to be logged in to view product details.</p>
                <div class="login-prompt-buttons">
                    <a href="login.html" class="login-prompt-btn login-btn">Login</a>
                    <button class="login-prompt-btn cancel-btn" onclick="hideLoginPrompt()">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    // Add the CSS styles for the modal
    const styleCSS = `
        .login-prompt-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 9999;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .login-prompt-box {
            background: white;
            padding: 40px;
            border-radius: 8px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .login-prompt-box h2 {
            margin-bottom: 15px;
            color: #232f3e;
        }
        .login-prompt-box p {
            margin-bottom: 25px;
            color: #666;
        }
        .login-prompt-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
        }
        .login-prompt-btn {
            padding: 12px 30px;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
        }
        .login-btn {
            background: #f90;
            color: white;
        }
        .cancel-btn {
            background: #f0f0f0;
            color: #666;
        }
    `;
    
    const styleTag = document.createElement('style');
    styleTag.textContent = styleCSS;
    document.head.appendChild(styleTag);
    
    // Inject modal at the start of body
    document.body.insertAdjacentHTML('afterbegin', modalHTML);
}

// Show/hide login prompt
window.showLoginPrompt = function() {
    const modal = document.getElementById('loginPromptModal');
    if (modal) modal.style.display = 'flex';
};

window.hideLoginPrompt = function() {
    const modal = document.getElementById('loginPromptModal');
    if (modal) modal.style.display = 'none';
};

// ==================== CHECK LOGIN STATUS ====================
// Check if user is logged in
function isUserLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true' && localStorage.getItem('supabase_session') !== null;
}

// Get current user ID
function getCurrentUserId() {
    try {
        const sessionData = localStorage.getItem('supabase_session');
        if (!sessionData) return null;
        const session = JSON.parse(sessionData);
        return session.user?.id || null;
    } catch (e) {
        return null;
    }
}

// Get basket for current user
function getUserBasket() {
    const userId = getCurrentUserId();
    if (!userId) return [];
    const basketKey = `basket_${userId}`;
    return JSON.parse(localStorage.getItem(basketKey)) || [];
}

// Save basket for current user
function saveUserBasket(basket) {
    const userId = getCurrentUserId();
    if (!userId) return;
    const basketKey = `basket_${userId}`;
    localStorage.setItem(basketKey, JSON.stringify(basket));
    updateBasketCount();
}

// ==================== FIND PRODUCT HELPER ====================
// Find product by ID from various sources
function findProductById(productId) {
    console.log('🔍 Looking for product with ID:', productId);
    console.log('📦 window.products:', window.products);
    console.log('📦 window.allProducts:', window.allProducts);
    console.log('📦 products variable (from script.js):', typeof products !== 'undefined' ? products : 'not defined');
    
    let product = null;
    
    // Try 1: Check window.products (from script.js)
    if (window.products && Array.isArray(window.products)) {
        product = window.products.find(p => String(p.id) === String(productId));
        if (product) {
            console.log('✅ Found product in window.products:', product.title);
            return product;
        }
    }
    
    // Try 2: Check window.allProducts (fallback)
    if (window.allProducts && Array.isArray(window.allProducts)) {
        product = window.allProducts.find(p => String(p.id) === String(productId));
        if (product) {
            console.log('✅ Found product in window.allProducts:', product.title);
            return product;
        }
    }
    
    // Try 3: Check global products variable (from script.js)
    if (typeof products !== 'undefined' && Array.isArray(products)) {
        product = products.find(p => String(p.id) === String(productId));
        if (product) {
            console.log('✅ Found product in products variable:', product.title);
            // Also expose it to window for future use
            window.products = products;
            return product;
        }
    }
    
    // Try 4: Extract from DOM
    console.log('🔄 Trying to extract product from DOM...');
    const productCards = document.querySelectorAll('.product-card');
    for (const card of productCards) {
        // Check all possible onclick attributes
        const onclick = card.getAttribute('onclick') || '';
        const dataId = card.getAttribute('data-product-id') || '';
        const cardId = card.id || '';
        
        if (onclick.includes(`id=${productId}`) || 
            onclick.includes(`id='${productId}'`) || 
            onclick.includes(`id="${productId}"`) ||
            String(dataId) === String(productId) ||
            String(cardId) === String(productId)) {
            
            const titleEl = card.querySelector('.product-title');
            const priceEl = card.querySelector('.product-price');
            const imgEl = card.querySelector('img');
            const title = titleEl ? titleEl.textContent : 'Product';
            const priceText = priceEl ? priceEl.textContent.replace(/[$,]/g, '') : '0';
            const image = imgEl ? imgEl.src : '';
            
            product = {
                id: productId,
                title: title,
                price: parseFloat(priceText) || 0,
                image: image,
                image_url: image,
                seller_id: card.getAttribute('data-seller-id') || null
            };
            console.log('✅ Found product from DOM:', product.title);
            return product;
        }
    }
    
    console.log('❌ Product not found anywhere!');
    return null;
}

// ==================== PROTECTED ACTIONS ====================
// Check if user is logged in before navigating to product detail
window.requireLogin = function(callback) {
    if (!isUserLoggedIn()) {
        showLoginPrompt();
        return false;
    }
    if (typeof callback === 'function') {
        callback();
    }
    return true;
};

// Navigate to product detail (protected)
window.goToProductDetail = function(productId) {
    if (window.requireLogin(function() {
        window.location.href = 'product-detail.html?id=' + productId;
    })) {
        // requireLogin already handled the navigation
    }
};

// ==================== ADD TO BASKET (FIXED) ====================
// Add to basket - uses improved product lookup
window.addToBasket = function(productId, quantity = 1) {
    console.log('🛒 addToBasket called with productId:', productId);
    
    // Check if user is logged in
    if (!isUserLoggedIn()) {
        showNotificationAuth('Please login to add items to basket');
        setTimeout(() => {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
        }, 1500);
        return;
    }
    
    // Find the product using the helper function
    const product = findProductById(productId);
    
    if (!product) {
        showNotificationAuth('Product not found. Please refresh and try again.');
        console.error('❌ Product with ID', productId, 'not found in any data source');
        return;
    }
    
    console.log('✅ Product found:', product.title, 'Price:', product.price);
    
    // Get current basket
    const basket = getUserBasket();
    const existingItem = basket.find(item => String(item.id) === String(productId));
    
    if (existingItem) {
        existingItem.quantity += quantity;
        console.log('📦 Updated existing item quantity to:', existingItem.quantity);
    } else {
        basket.push({
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.image_url || product.image || 'https://via.placeholder.com/300x300?text=Product',
            quantity: quantity,
            seller_id: product.seller_id || null
        });
        console.log('📦 Added new item to basket:', product.title);
    }
    
    saveUserBasket(basket);
    showNotificationAuth('Item added to Basket!');
    console.log('✅ Basket updated successfully');
};

// ==================== NOTIFICATION ====================
// Show notification - uses a different name to avoid conflicts
function showNotificationAuth(message) {
    // Create notification directly - no recursion
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
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 2000);
}

// ==================== BASKET COUNT ====================
// Update basket count
window.updateBasketCount = function(count) {
    const el = document.getElementById('basketCount');
    if (el) { 
        if (count !== undefined) {
            el.textContent = count;
            el.style.display = count > 0 ? 'flex' : 'none';
        } else {
            // Calculate from basket
            const basket = getUserBasket();
            const total = basket.reduce((sum, item) => sum + (item.quantity || 0), 0);
            el.textContent = total;
            el.style.display = total > 0 ? 'flex' : 'none';
        }
    }
};

// ==================== LOGOUT ====================
// Logout function
window.logout = function() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('supabase_session');
    window.location.href = 'index.html';
};

// ==================== SHOW SELLER CONTACT (PROTECTED) ====================
window.showSellerContactSafe = function(callback) {
    if (!isUserLoggedIn()) {
        showLoginPrompt();
        return false;
    }
    if (typeof callback === 'function') {
        callback();
    }
    return true;
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    injectLoginPrompt();
    checkLoginStatus();
    updateBasketCount();
    
    // Try to get products from script.js after it loads
    setTimeout(function() {
        if (typeof products !== 'undefined' && Array.isArray(products)) {
            window.products = products;
            console.log('📦 Synced products from script.js to window.products:', products.length);
        }
    }, 1000);
});

// Also check when page becomes visible (in case user logs in/out in another tab)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        checkLoginStatus();
        updateBasketCount();
    }
});

function checkLoginStatus() {
    const isLoggedIn = isUserLoggedIn();
    const sessionData = localStorage.getItem('supabase_session');
    
    const accountLabel = document.querySelector('.account-label');
    const accountLink = document.querySelector('.account-link');
    const logoutBtn = document.getElementById('logoutBtn');
    const accountMenu = document.getElementById('accountMenu');
    
    if (isLoggedIn && sessionData && accountLabel && accountLink) {
        try {
            const session = JSON.parse(sessionData);
            const userEmail = session.user?.email || 'User';
            const userName = session.user?.user_metadata?.full_name || userEmail.split('@')[0];
            
            accountLabel.textContent = 'Hello,';
            accountLink.textContent = userName;
            accountLink.href = '#';
            
            if (accountMenu) accountMenu.classList.add('logged-in');
            
            if (logoutBtn) {
                logoutBtn.style.display = 'inline-block';
            }
        } catch (e) {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('supabase_session');
            setLoggedOutState(accountLabel, accountLink, logoutBtn, accountMenu);
        }
    } else if (accountLabel && accountLink) {
        setLoggedOutState(accountLabel, accountLink, logoutBtn, accountMenu);
    }
}

function setLoggedOutState(accountLabel, accountLink, logoutBtn, accountMenu) {
    accountLabel.textContent = 'Hello, Sign in';
    accountLink.textContent = 'Account & Lists';
    accountLink.href = 'login.html';
    
    if (accountMenu) accountMenu.classList.remove('logged-in');
    
    if (logoutBtn) {
        logoutBtn.style.display = 'none';
    }
}

// ============================================
// EXPOSE FUNCTIONS TO GLOBAL WINDOW OBJECT
// ============================================
window.isUserLoggedIn = isUserLoggedIn;
window.getCurrentUserId = getCurrentUserId;
window.getUserBasket = getUserBasket;
window.saveUserBasket = saveUserBasket;
window.injectLoginPrompt = injectLoginPrompt;
window.checkLoginStatus = checkLoginStatus;
window.setLoggedOutState = setLoggedOutState;
window.findProductById = findProductById;
window.showNotificationAuth = showNotificationAuth;

console.log('✅ Auth check loaded successfully');
