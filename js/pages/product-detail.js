let currentProduct = null;

        document.addEventListener('DOMContentLoaded', async function() {
            await loadProductDetail();
            updateHeaderForLoggedInUser();
            updateBasketCount();
        });

        async function loadProductDetail() {
            const urlParams = new URLSearchParams(window.location.search);
            const productId = urlParams.get('id');
            
            if (!productId) {
                document.getElementById('productDetail').innerHTML = '<p style="text-align: center; padding: 40px;">Product not found</p>';
                return;
            }
            
            try {
                const SUPABASE_URL = window.SUPABASE_URL;
                const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
                
                // Fetch product
                const productRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                });
                
                const products = await productRes.json();
                
                if (products && products.length > 0) {
                    const product = products[0];
                    currentProduct = product;
                    
                    // Fetch seller info
                    let seller = {};
                    if (product.seller_id) {
                        const sellerRes = await fetch(`${SUPABASE_URL}/rest/v1/sellers?user_id=eq.${product.seller_id}`, {
                            headers: {
                                'apikey': SUPABASE_ANON_KEY,
                                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                            }
                        });
                        const sellers = await sellerRes.json();
                        seller = sellers && sellers.length > 0 ? sellers[0] : {};
                    }
                    
                    // Fetch seller ratings
                    let ratingInfo = { average: 0, count: 0, stars: '☆☆☆☆☆' };
                    if (product.seller_id) {
                        const ratingRes = await fetch(`${SUPABASE_URL}/rest/v1/ratings?seller_id=eq.${product.seller_id}&select=rating`, {
                            headers: {
                                'apikey': SUPABASE_ANON_KEY,
                                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                            }
                        });
                        const ratings = await ratingRes.json();
                        if (ratings && ratings.length > 0) {
                            const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
                            const average = sum / ratings.length;
                            const fullStars = Math.floor(average);
                            const hasHalfStar = average % 1 >= 0.5;
                            let stars = '';
                            for (let i = 0; i < fullStars; i++) stars += '';
                            if (hasHalfStar) stars += '½';
                            const emptyStars = 5 - Math.ceil(average);
                            for (let i = 0; i < emptyStars; i++) stars += '☆';
                            
                            ratingInfo = {
                                average: average,
                                count: ratings.length,
                                stars: stars
                            };
                        }
                    }
                    
                    displayProductDetail(product, seller, ratingInfo);
                } else {
                    document.getElementById('productDetail').innerHTML = '<p style="text-align: center; padding: 40px;">Product not found</p>';
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('productDetail').innerHTML = '<p style="text-align: center; padding: 40px;">Error loading product</p>';
            }
        }

        function displayProductDetail(product, seller, ratingInfo) {
            const stars = '';
            const phoneNumber = seller?.business_phone || '';
            const shopLocation = seller?.business_address || 'Location not specified';
            const sellerName = seller?.business_name || 'Unknown Seller';
            
            document.getElementById('productDetail').innerHTML = `
                <div class="product-detail-content">
                    <div>
                        <img src="${product.image_url || 'https://via.placeholder.com/500x500?text=Product'}" 
                             alt="${product.title}" 
                             class="product-detail-image"
                             onerror="this.src='https://via.placeholder.com/500x500?text=Product'">
                    </div>
                    <div class="product-detail-info">
                        <h1>${product.title}</h1>
                        <div style="color: #f90; font-size: 18px;">${stars}</div>
                        <div class="product-detail-price">$${parseFloat(product.price).toFixed(2)}</div>
                        <p class="product-detail-description">${product.description || 'No description available'}</p>
                        
                        <div class="seller-info">
                            <h3>Seller Information</h3>
                            <p><strong>Shop:</strong> ${sellerName}</p>
                            <p><strong>Location:</strong> ${shopLocation}</p>
                            ${phoneNumber ? `<p><strong>Phone:</strong> ${phoneNumber}</p>` : ''}
                            
                            <!-- VIEW SHOP BUTTON - ADDED HERE -->
                            <a href="shop.html?seller=${product.seller_id}" class="view-shop-btn">View Seller's Shop</a>
                            
                            <!-- Seller Rating Display -->
                            <div class="seller-rating-large">
                                <strong>Seller Rating:</strong><br>
                                ${ratingInfo.count > 0 ? 
                                    `<span class="rating-stars-large">${ratingInfo.stars}</span>
                                     <span class="rating-text">${ratingInfo.average.toFixed(1)} out of 5 (${ratingInfo.count} ${ratingInfo.count === 1 ? 'rating' : 'ratings'})</span>` : 
                                    '<span class="rating-text">No ratings yet</span>'
                                }
                            </div>
                            
                            <!-- RATE SELLER BUTTON -->
                            <a href="rate-seller.html?sellerId=${product.seller_id}" class="btn-rate-seller">
                                 Rate This Seller
                            </a>
                        </div>
                        
                        <div class="detail-actions">
                            <button class="btn-add-cart-large" onclick="addToBasket('${product.id}')">Add to Basket</button>
                            ${product.seller_id ? `
                                <a href="messages.html?productId=${product.id}&seller=${product.seller_id}" 
                                   class="btn-buy-now-large">
                                    Send a message
                                </a>
                            ` : `
                                <button class="btn-buy-now-large" onclick="buyNow('${product.id}')">Buy Now</button>
                            `}
                        </div>
                    </div>
                </div>
            `;
        }

        async function addToBasket(productId, quantity = 1) {
            const sessionData = localStorage.getItem('supabase_session');
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            
            if (!isLoggedIn || !sessionData) {
                alert('Please login to add items to basket');
                window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
                return;
            }

            const session = JSON.parse(sessionData);
            const userId = session.user?.id;
            
            if (!userId) return;

            const basketKey = `basket_${userId}`;
            let userBasket = JSON.parse(localStorage.getItem(basketKey)) || [];
            
            const existingItem = userBasket.find(item => item.id == productId);
            
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                userBasket.push({
                    id: productId,
                    title: document.querySelector('h1').textContent,
                    price: parseFloat(document.querySelector('.product-detail-price').textContent.replace('$', '')),
                    image: document.querySelector('.product-detail-image').src,
                    quantity: quantity,
                    seller_id: currentProduct?.seller_id || null
                });
            }
            
            localStorage.setItem(basketKey, JSON.stringify(userBasket));
            updateBasketCount();
            alert('Item added to basket!');
        }

        function buyNow(productId) {
            addToBasket(productId, 1).then(() => {
                window.location.href = 'checkout.html';
            });
        }

        function updateBasketCount() {
            if (window.uiCommon) window.uiCommon.updateBasketCount('basketCount');
        }

        function updateHeaderForLoggedInUser() {
            if (!window.uiCommon) return;
            window.uiCommon.updateHeaderForLoggedInUser({
                accountLabelId: 'accountLabel',
                accountLinkId: 'accountLink',
                logoutBtnId: 'logoutBtn'
            });
        }

        window.handleSearch = function() {
            if (window.uiCommon) {
                window.uiCommon.handleSearchRedirect({ includeCategory: false });
            }
        };

        window.logout = function() {
            if (window.uiCommon) {
                window.uiCommon.logoutToHome(false);
            }
        };
