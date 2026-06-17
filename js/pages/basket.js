// User-specific basket functions
        let currentUserId = null;
        let userBasket = [];

        // Check login status on page load
        document.addEventListener('DOMContentLoaded', function() {
            checkLoginStatus();
            loadUserBasket();
        });

        function checkLoginStatus() {
            const sessionData = localStorage.getItem('supabase_session');
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            const logoutBtn = document.getElementById('logoutBtn');
            const accountLabel = document.getElementById('accountLabel');
            const accountLink = document.getElementById('accountLink');

            if (isLoggedIn && sessionData) {
                try {
                    const session = JSON.parse(sessionData);
                    currentUserId = session.user?.id;
                    const userEmail = session.user?.email || 'User';
                    const userName = userEmail.split('@')[0];
                    
                    // Update UI for logged in user
                    if (window.uiCommon) {
                        window.uiCommon.updateHeaderForLoggedInUser({
                            accountLabelId: 'accountLabel',
                            accountLinkId: 'accountLink',
                            logoutBtnId: 'logoutBtn'
                        });
                    } else {
                        if (accountLabel) accountLabel.textContent = `Hello, ${userName}`;
                        if (accountLink) accountLink.textContent = 'Your Account';
                    }
                    if (logoutBtn) logoutBtn.style.display = 'inline-block';
                    
                    console.log('Logged in as:', userEmail, 'User ID:', currentUserId);
                } catch (e) {
                    console.error('Error parsing session:', e);
                }
            } else {
                // Show login prompt in basket
                currentUserId = null;
                if (logoutBtn) logoutBtn.style.display = 'none';
                showLoginPrompt();
            }
        }

        function showLoginPrompt() {
            const basketContent = document.getElementById('basketContent');
            basketContent.innerHTML = `
                <div class="login-prompt">
                    <h2>Please sign in to view your basket</h2>
                    <p>You need to be logged in to see items in your basket.</p>
                    <a href="login.html?redirect=Basket.html" class="btn-login">Sign In</a>
                </div>
            `;
        }

        function loadUserBasket() {
            if (!currentUserId) return;

            const basketContent = document.getElementById('basketContent');
            
            // Get user-specific basket from localStorage
            const basketKey = `basket_${currentUserId}`;
            userBasket = JSON.parse(localStorage.getItem(basketKey)) || [];
            
            if (userBasket.length === 0) {
                basketContent.innerHTML = `
                    <div class="empty-basket">
                        <p>Your basket is empty</p>
                        <a href="index.html" class="btn-shop">Start Shopping</a>
                    </div>
                `;
                updateBasketCount(0);
                return;
            }

            // Display basket items
            let subtotal = 0;
            let itemsHtml = '<div class="basket-items">';
            
            userBasket.forEach(item => {
                const itemTotal = item.price * item.quantity;
                subtotal += itemTotal;
                
                itemsHtml += `
                    <div class="basket-item">
                        <img src="${item.image || 'https://via.placeholder.com/120x120?text=Product'}" alt="${item.title}" class="basket-item-image">
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
                        <div class="basket-item-price">$${itemTotal.toFixed(2)}</div>
                    </div>
                `;
            });
            
            itemsHtml += '</div>';

            // Calculate totals
            const shipping = subtotal > 35 ? 0 : 5.99;
            const tax = subtotal * 0.08;
            const total = subtotal + shipping + tax;

            // Summary HTML
            const summaryHtml = `
                <div class="basket-summary">
                    <h2>Order Summary</h2>
                    <div class="summary-row">
                        <span>Subtotal (${userBasket.reduce((sum, item) => sum + item.quantity, 0)} items):</span>
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
                    <button class="btn-checkout" onclick="checkout()">Proceed to Checkout</button>
                </div>
            `;

            basketContent.innerHTML = `
                <div class="basket-content">
                    ${itemsHtml}
                    ${summaryHtml}
                </div>
            `;

            updateBasketCount(userBasket.reduce((sum, item) => sum + item.quantity, 0));
        }

        function updateQuantity(productId, change, newValue) {
            if (!currentUserId) return;
            
            const basketKey = `basket_${currentUserId}`;
            const item = userBasket.find(i => i.id == productId);
            
            if (!item) return;
            
            if (newValue !== undefined) {
                item.quantity = parseInt(newValue) || 1;
            } else {
                item.quantity = Math.max(1, item.quantity + change);
            }
            
            localStorage.setItem(basketKey, JSON.stringify(userBasket));
            loadUserBasket();
        }

        function removeFromBasket(productId) {
            if (!currentUserId) return;
            
            const basketKey = `basket_${currentUserId}`;
            userBasket = userBasket.filter(item => item.id != productId);
            localStorage.setItem(basketKey, JSON.stringify(userBasket));
            loadUserBasket();
            showNotification('Item removed from basket');
        }

        function checkout() {
            if (!currentUserId) {
                window.location.href = 'login.html?redirect=Basket.html';
                return;
            }
            window.location.href = 'checkout.html';
        }

        function updateBasketCount(count) {
            const basketCount = document.getElementById('basketCount');
            if (basketCount) {
                basketCount.textContent = count;
                basketCount.style.display = count > 0 ? 'flex' : 'none';
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

        // Logout function
        window.logout = function() {
            if (window.uiCommon) window.uiCommon.logoutToHome(true);
        };

        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
