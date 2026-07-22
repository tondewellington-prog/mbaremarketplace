// =====================================================
// SUPABASE CONFIGURATION - FIX FOR UNDEFINED ERROR
// =====================================================
if (typeof window.SUPABASE_URL === 'undefined') {
    window.SUPABASE_URL = 'https://fnncerdxfhwlrdopswpx.supabase.co';
}
if (typeof window.SUPABASE_ANON_KEY === 'undefined') {
    window.SUPABASE_ANON_KEY = 'sb_publishable_qjN17tdmLu5yvp9iIUBEjg_ZDZCWMhK';
}

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

// =====================================================
// FREE TRIAL: Grant 1-month free tier_150 on registration
// =====================================================
async function grantFreeTrial(userId, accessToken) {
    const SUPABASE_URL = window.SUPABASE_URL;
    const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubmNlcmR4Zmh3bHJkb3Bzd3B4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwMTgwOSwiZXhwIjoyMDgyNjc3ODA5fQ.gS45zReH5gtMeTY74tjb6ECfdjENglLejU4kTFNnIh0';
    
    try {
        // Check if subscription already exists
        const checkResp = await fetch(`${SUPABASE_URL}/rest/v1/seller_subscriptions?seller_id=eq.${encodeURIComponent(userId)}&select=id`, {
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`
            }
        });
        
        const existing = await checkResp.json();
        if (existing && existing.length > 0) {
            console.log('Subscription already exists, skipping free trial.');
            return true;
        }
        
        // Create free trial subscription (tier_150 for 30 days)
        const now = new Date();
        const expiryDate = new Date(now);
        expiryDate.setDate(expiryDate.getDate() + 30);
        
        const subscriptionData = {
            seller_id: String(userId),
            plan_type: 'tier_150',
            status: 'active',
            payment_status: 'free_trial',
            auto_renew: false,
            paynow_reference: null,
            phone_number: null,
            current_period_start: now.toISOString(),
            current_period_end: expiryDate.toISOString(),
            created_at: now.toISOString()
        };
        
        const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/seller_subscriptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(subscriptionData)
        });
        
        if (insertResp.ok) {
            console.log('Free trial granted: tier_150 for 30 days');
            localStorage.setItem(`mbare_tier_${userId}`, 'tier_150');
            return true;
        } else {
            const err = await insertResp.json();
            console.error('Failed to grant free trial:', err);
            return false;
        }
    } catch (error) {
        console.error('Error granting free trial:', error);
        return false;
    }
}

// Check seller status - with free trial check
document.addEventListener('DOMContentLoaded', async function() {
    const sessionData = localStorage.getItem('supabase_session');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (!isLoggedIn || !sessionData) {
        return;
    }

    const session = JSON.parse(sessionData);
    const userId = session.user?.id;
    const accessToken = session.access_token;
    
    const SUPABASE_URL = window.SUPABASE_URL;
    const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubmNlcmR4Zmh3bHJkb3Bzd3B4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwMTgwOSwiZXhwIjoyMDgyNjc3ODA5fQ.gS45zReH5gtMeTY74tjb6ECfdjENglLejU4kTFNnIh0';

    try {
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
    let accessToken = session.access_token;
    
    const SUPABASE_URL = window.SUPABASE_URL;
    const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubmNlcmR4Zmh3bHJkb3Bzd3B4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwMTgwOSwiZXhwIjoyMDgyNjc3ODA5fQ.gS45zReH5gtMeTY74tjb6ECfdjENglLejU4kTFNnIh0';

    try {
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
            // =====================================================
            // FREE TRIAL: Grant 1-month free tier_150
            // =====================================================
            const trialGranted = await grantFreeTrial(userId, accessToken);
            
            const messageDiv = document.getElementById('message');
            messageDiv.style.display = 'block';
            messageDiv.style.backgroundColor = '#d4edda';
            messageDiv.style.color = '#155724';
            
            if (trialGranted) {
                messageDiv.innerHTML = 'Registration successful! You have been granted a 1-month free trial of Merchant Basic. Redirecting to your dashboard...';
            } else {
                messageDiv.innerHTML = 'Registration successful! Redirecting to your dashboard...';
            }
            
            localStorage.setItem('isSeller', 'true');
            
            // Add a manual redirect fallback
            setTimeout(() => {
                window.location.href = 'seller-dashboard.html';
            }, 2000);
            
            // Fallback redirect after 5 seconds
            setTimeout(() => {
                // If still on this page, force redirect
                if (window.location.pathname.includes('seller-register.html')) {
                    window.location.href = 'seller-dashboard.html';
                }
            }, 5000);
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
