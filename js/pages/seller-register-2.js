function formatSellerPhone() {
            const countryCode = document.getElementById('sellerCountryCode').value;
            let phoneLocal = document.getElementById('businessPhone').value;
            let cleanedLocal = phoneLocal.replace(/\D/g, '');
            if (cleanedLocal.startsWith('0')) {
                cleanedLocal = cleanedLocal.substring(1);
            }
            if (cleanedLocal.startsWith(countryCode)) {
                return cleanedLocal;
            }
            return countryCode + cleanedLocal;
        }

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
                    body: JSON.stringify({ refresh_token: refreshToken })
                });
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('supabase_session', JSON.stringify(data));
                    localStorage.setItem('isLoggedIn', 'true');
                    return { success: true, session: data };
                }
                return { success: false, error: data };
            } catch (error) {
                console.error('Token refresh error:', error);
                return { success: false, error };
            }
        }

        // FIXED: Check seller status - using 'user_id' column (matches your database)
        document.addEventListener('DOMContentLoaded', async function() {
            const sessionData = localStorage.getItem('supabase_session');
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            
            if (!isLoggedIn || !sessionData) {
                return;
            }

            const session = JSON.parse(sessionData);
            const userId = session.user?.id;
            
            const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubmNlcmR4Zmh3bHJkb3Bzd3B4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwMTgwOSwiZXhwIjoyMDgyNjc3ODA5fQ.gS45zReH5gtMeTY74tjb6ECfdjENglLejU4kTFNnIh0';

            try {
                // FIXED: Use 'user_id' instead of 'seller_id'
                const response = await fetch(`${SUPABASE_URL}/rest/v1/sellers?user_id=eq.${encodeURIComponent(userId)}&select=id`, {
                    headers: {
                        'apikey': SERVICE_KEY,
                        'Authorization': `Bearer ${SERVICE_KEY}`
                    }
                });
                
                if (response.status === 401) {
                    const refreshResult = await refreshAccessToken(session.refresh_token);
                    if (refreshResult.success) {
                        const retryResponse = await fetch(`${SUPABASE_URL}/rest/v1/sellers?user_id=eq.${encodeURIComponent(userId)}&select=id`, {
                            headers: {
                                'apikey': SERVICE_KEY,
                                'Authorization': `Bearer ${SERVICE_KEY}`
                            }
                        });
                        const sellers = await retryResponse.json();
                        if (sellers && sellers.length > 0) {
                            document.getElementById('alreadyRegisteredMessage').style.display = 'block';
                            document.getElementById('sellerForm').style.display = 'none';
                            setTimeout(() => { window.location.href = 'seller-dashboard.html'; }, 3000);
                        }
                    }
                    return;
                }
                
                const sellers = await response.json();
                if (sellers && sellers.length > 0) {
                    document.getElementById('alreadyRegisteredMessage').style.display = 'block';
                    document.getElementById('sellerForm').style.display = 'none';
                    setTimeout(() => { window.location.href = 'seller-dashboard.html'; }, 3000);
                }
            } catch (error) {
                console.error('Error checking seller status:', error);
            }
        });

        async function handleSellerRegistration(event) {
            event.preventDefault();
            document.getElementById('loadingSpinner').style.display = 'block';
            
            const sessionData = localStorage.getItem('supabase_session');
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            
            if (!isLoggedIn || !sessionData) {
                document.getElementById('loadingSpinner').style.display = 'none';
                alert('Please login first to register as a seller');
                window.location.href = 'login.html?redirect=seller-register.html';
                return;
            }

            let session = JSON.parse(sessionData);
            let userId = session.user?.id;
            
            const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubmNlcmR4Zmh3bHJkb3Bzd3B4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwMTgwOSwiZXhwIjoyMDgyNjc3ODA5fQ.gS45zReH5gtMeTY74tjb6ECfdjENglLejU4kTFNnIh0';

            try {
                // FIXED: Use 'user_id' instead of 'seller_id'
                let checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/sellers?user_id=eq.${encodeURIComponent(userId)}&select=id`, {
                    headers: {
                        'apikey': SERVICE_KEY,
                        'Authorization': `Bearer ${SERVICE_KEY}`
                    }
                });
                
                const existing = await checkResponse.json();
                if (existing && existing.length > 0) {
                    document.getElementById('loadingSpinner').style.display = 'none';
                    window.location.href = 'seller-dashboard.html';
                    return;
                }

                const businessName = document.getElementById('businessName').value;
                const businessAddress = document.getElementById('businessAddress').value;
                const businessDescription = document.getElementById('businessDescription').value;
                const businessType = document.getElementById('businessType').value;
                const businessEmail = document.getElementById('businessEmail').value;
                const formattedPhone = formatSellerPhone();

                // FIXED: Use 'user_id' column (matches your database)
                const sellerData = {
                    user_id: userId,
                    business_name: businessName,
                    business_phone: formattedPhone,
                    business_email: businessEmail,
                    business_address: businessAddress,
                    business_description: businessDescription,
                    business_type: businessType,
                    created_at: new Date().toISOString()
                };

                const response = await fetch(`${SUPABASE_URL}/rest/v1/sellers`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SERVICE_KEY,
                        'Authorization': `Bearer ${SERVICE_KEY}`,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(sellerData)
                });

                document.getElementById('loadingSpinner').style.display = 'none';

                if (response.ok) {
                    const messageDiv = document.getElementById('message');
                    messageDiv.style.display = 'block';
                    messageDiv.style.backgroundColor = '#d4edda';
                    messageDiv.style.color = '#155724';
                    messageDiv.innerHTML = 'Registration successful! Redirecting to your dashboard...';
                    
                    localStorage.setItem('isSeller', 'true');
                    
                    setTimeout(() => {
                        window.location.href = 'seller-dashboard.html';
                    }, 1500);
                } else {
                    const error = await response.json();
                    console.error('Registration failed:', error);
                    alert('Failed to register: ' + (error.message || 'Please try again'));
                }
            } catch (error) {
                document.getElementById('loadingSpinner').style.display = 'none';
                console.error('Error:', error);
                alert('Error submitting registration: ' + error.message);
            }
        }

        window.handleSellerRegistration = handleSellerRegistration;
        
        window.handleSearch = function() {
            if (window.uiCommon) {
                window.uiCommon.handleSearchRedirect({ includeCategory: false });
            }
        };
