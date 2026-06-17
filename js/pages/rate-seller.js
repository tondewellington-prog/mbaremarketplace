let selectedRating = 0;
        let sellerId = '';
        let orderId = '';
        let sellerName = '';

        // Token refresh function
        async function refreshAccessToken(refreshToken) {
            const SUPABASE_URL = window.SUPABASE_URL;
            const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
            
            try {
                const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY
                    },
                    body: JSON.stringify({
                        refresh_token: refreshToken
                    })
                });

                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('supabase_session', JSON.stringify(data));
                    localStorage.setItem('isLoggedIn', 'true');
                    return { success: true, session: data };
                } else {
                    return { success: false, error: data };
                }
            } catch (error) {
                console.error('Token refresh error:', error);
                return { success: false, error };
            }
        }

        document.addEventListener('DOMContentLoaded', async function() {
            const urlParams = new URLSearchParams(window.location.search);
            sellerId = urlParams.get('sellerId');
            orderId = urlParams.get('orderId') || null;
            
            if (!sellerId) {
                showError('Invalid seller ID');
                setTimeout(() => window.location.href = 'index.html', 2000);
                return;
            }
            
            // Check login status first
            await checkLoginAndLoad();
        });

        async function checkLoginAndLoad() {
            const sessionData = localStorage.getItem('supabase_session');
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            
            if (!isLoggedIn || !sessionData) {
                // Show login prompt
                document.getElementById('rateContainer').innerHTML = `
                    <div class="rate-box">
                        <div class="login-prompt">
                            <h2>Please Login</h2>
                            <p>You need to be logged in to rate a seller.</p>
                            <a href="login.html?redirect=${encodeURIComponent(window.location.href)}" class="btn-submit" style="display: inline-block; width: auto; padding: 12px 30px; text-decoration: none;">Login</a>
                        </div>
                    </div>
                `;
                return;
            }

            // Load the rating form
            await loadRatingForm();
        }

        async function loadRatingForm() {
            const container = document.getElementById('rateContainer');
            
            container.innerHTML = `
                <div class="rate-box">
                    <h1>Rate This Seller</h1>
                    <p style="color: #666; margin-bottom: 20px;">Share your experience to help other buyers</p>
                    
                    <div id="message" class="message"></div>
                    
                    <div id="sellerInfo" class="seller-info">
                        <p>Loading seller information...</p>
                    </div>
                    
                    <form id="ratingForm">
                        <div class="form-group">
                            <label>Your Rating *</label>
                            <div class="rating-stars" id="ratingStars">
                                <span class="rating-star" data-rating="1">☆</span>
                                <span class="rating-star" data-rating="2">☆</span>
                                <span class="rating-star" data-rating="3">☆</span>
                                <span class="rating-star" data-rating="4">☆</span>
                                <span class="rating-star" data-rating="5">☆</span>
                            </div>
                            <input type="hidden" id="ratingValue" value="0">
                        </div>
                        
                        <div class="form-group">
                            <label>Your Review (Optional)</label>
                            <textarea id="reviewText" rows="4" placeholder="What did you like or dislike about this seller?"></textarea>
                        </div>
                        
                        <button type="submit" class="btn-submit" id="submitBtn">Submit Rating</button>
                    </form>
                </div>
            `;
            
            await loadSellerInfo();
            setupRatingStars();
            updateHeaderForLoggedInUser();
            updateBasketCount();
        }

        async function loadSellerInfo() {
            try {
                const SUPABASE_URL = window.SUPABASE_URL;
                const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
                
                const response = await fetch(`${SUPABASE_URL}/rest/v1/sellers?user_id=eq.${sellerId}&select=*`, {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                });
                
                const sellers = await response.json();
                
                if (sellers && sellers.length > 0) {
                    const seller = sellers[0];
                    sellerName = seller.business_name || 'Unknown Seller';
                    document.getElementById('sellerInfo').innerHTML = `
                        <h3 style="margin-bottom: 10px;">${sellerName}</h3>
                        <p><strong>Type:</strong> ${seller.business_type || 'Not specified'}</p>
                        <p><strong>Location:</strong> ${seller.business_address || 'Not specified'}</p>
                    `;
                } else {
                    document.getElementById('sellerInfo').innerHTML = '<p>Seller information not found</p>';
                }
            } catch (error) {
                console.error('Error loading seller:', error);
                document.getElementById('sellerInfo').innerHTML = '<p>Error loading seller information</p>';
            }
        }

        function setupRatingStars() {
            const stars = document.querySelectorAll('.rating-star');
            stars.forEach(star => {
                star.addEventListener('click', function() {
                    const rating = parseInt(this.dataset.rating);
                    setRating(rating);
                });
            });
        }

        function setRating(rating) {
            selectedRating = rating;
            document.getElementById('ratingValue').value = rating;
            
            const stars = document.querySelectorAll('.rating-star');
            stars.forEach((star, index) => {
                if (index < rating) {
                    star.textContent = '';
                    star.classList.add('selected');
                } else {
                    star.textContent = '☆';
                    star.classList.remove('selected');
                }
            });
        }

        document.getElementById('rateContainer').addEventListener('submit', async function(e) {
            if (e.target && e.target.id === 'ratingForm') {
                e.preventDefault();
                await handleSubmitRating(e);
            }
        });

        async function handleSubmitRating(event) {
            // Get fresh session data
            let sessionData = localStorage.getItem('supabase_session');
            let isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            
            if (!isLoggedIn || !sessionData) {
                showMessage('Please login to submit a rating', 'error');
                setTimeout(() => {
                    window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
                }, 1500);
                return;
            }
            
            if (selectedRating === 0) {
                showMessage('Please select a rating', 'error');
                return;
            }
            
            let session = JSON.parse(sessionData);
            let userId = session.user?.id;
            let accessToken = session.access_token;
            let refreshToken = session.refresh_token;
            
            const reviewText = document.getElementById('reviewText').value;
            const submitBtn = document.getElementById('submitBtn');
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
            
            try {
                const SUPABASE_URL = window.SUPABASE_URL;
                const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
                
                // Try to submit with current token
                let response = await fetch(`${SUPABASE_URL}/rest/v1/ratings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        seller_id: sellerId,
                        buyer_id: userId,
                        order_id: orderId,
                        rating: selectedRating,
                        review: reviewText || null,
                        created_at: new Date().toISOString()
                    })
                });
                
                // If token expired, refresh it
                if (response.status === 401) {
                    console.log('Token expired, refreshing...');
                    const refreshResult = await refreshAccessToken(refreshToken);
                    
                    if (refreshResult.success) {
                        // Update session with new token
                        session = refreshResult.session;
                        accessToken = session.access_token;
                        
                        // Retry the request
                        response = await fetch(`${SUPABASE_URL}/rest/v1/ratings`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': SUPABASE_ANON_KEY,
                                'Authorization': `Bearer ${accessToken}`
                            },
                            body: JSON.stringify({
                                seller_id: sellerId,
                                buyer_id: userId,
                                order_id: orderId,
                                rating: selectedRating,
                                review: reviewText || null,
                                created_at: new Date().toISOString()
                            })
                        });
                    } else {
                        throw new Error('Session expired. Please login again.');
                    }
                }
                
                if (response.ok) {
                    showMessage('Thank you for your rating!', 'success');
                    
                    if (window.trackActivity) {
                        window.trackActivity('rating_submitted', {
                            seller_id: sellerId,
                            rating: selectedRating
                        });
                    }
                    
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                } else {
                    const error = await response.json();
                    console.error('Error response:', error);
                    showMessage('Failed to submit rating. Please try again.', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit Rating';
                }
                
            } catch (error) {
                console.error('Error submitting rating:', error);
                showMessage(error.message || 'Error submitting rating', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Rating';
            }
        }

        function showMessage(text, type) {
            const msgDiv = document.getElementById('message');
            if (msgDiv) {
                msgDiv.textContent = text;
                msgDiv.className = `message ${type}`;
                
                if (type === 'success') {
                    setTimeout(() => {
                        msgDiv.style.display = 'none';
                    }, 5000);
                }
            }
        }

        function showError(text) {
            const container = document.getElementById('rateContainer');
            container.innerHTML = `
                <div class="rate-box">
                    <div class="message error" style="display: block;">
                        ${text}
                    </div>
                    <a href="index.html" class="btn-submit" style="display: inline-block; width: auto; padding: 12px 30px; text-decoration: none; margin-top: 20px;">Go Home</a>
                </div>
            `;
        }

        function updateHeaderForLoggedInUser() {
            if (!window.uiCommon) return;
            window.uiCommon.updateHeaderForLoggedInUser({
                accountLabelId: 'accountLabel',
                logoutBtnId: 'logoutBtn'
            });
        }

        function updateBasketCount() {
            if (window.uiCommon) window.uiCommon.updateBasketCount('basketCount');
        }

        window.handleSearch = function() {
            if (window.uiCommon) {
                window.uiCommon.handleSearchRedirect({ includeCategory: true, defaultCategory: 'all' });
            }
        };

        window.logout = function() {
            if (window.uiCommon) window.uiCommon.logoutToHome(false);
        };
