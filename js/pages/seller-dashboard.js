// ==================== CONFIGURATION ====================
window.SUPABASE_URL = 'https://fnncerdxfhwlrdopswpx.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_qjN17tdmLu5yvp9iIUBEjg_ZDZCWMhK';
const IMGBB_API_KEY = '670ea8c38e955ebdfdf84a41489713bf';

// Your backend VPS Server Base URL
const API_BASE_URL = 'https://api.mbaremarketplace.com';

let currentSellerId = null, currentAccessToken = null;
let currentTier = 'free', subscriptionStatus = 'inactive', subscriptionExpiry = null, autoRenew = true;
let sellerProducts = [], selectedImageFile = null, renewalCheckInterval = null;
let isRefreshing = false;  // Prevent concurrent refresh calls

const tierMap = {
    free: { name: 'Starter Plan', price: 'Free', maxProducts: 8, perks: '8 active products', badge: '', level: 0, amount: '0.00' },
    tier_150: { name: 'Merchant Basic', price: '$1.50 / month', maxProducts: 50, perks: '50 products', badge: 'POPULAR', level: 1, amount: '1.50' },
    tier_5: { name: 'Video Ads Plan', price: '$5 / month', maxProducts: 200, perks: '200 products + video ads', badge: 'VIDEO BOOST', level: 2, amount: '5.00' }
};

function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification' + (isError ? ' error' : '');
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// ==================== REFRESH SESSION ====================
async function refreshSession() {
    if (isRefreshing) {
        await new Promise(resolve => {
            const check = () => {
                if (!isRefreshing) resolve();
                else setTimeout(check, 200);
            };
            check();
        });
        const session = localStorage.getItem('supabase_session');
        return !!session;
    }

    isRefreshing = true;
    try {
        const sessionStr = localStorage.getItem('supabase_session');
        if (!sessionStr) {
            console.warn('No session found in localStorage.');
            return false;
        }
        const session = JSON.parse(sessionStr);
        const refreshToken = session.refresh_token;
        if (!refreshToken) {
            console.warn('No refresh token available.');
            return false;
        }

        const response = await fetch(`${window.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': window.SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (response.ok) {
            const newSession = await response.json();
            localStorage.setItem('supabase_session', JSON.stringify(newSession));
            currentAccessToken = newSession.access_token;
            console.log('Session refreshed successfully');
            return true;
        } else {
            console.error('Refresh failed with status:', response.status);
            localStorage.removeItem('supabase_session');
            localStorage.setItem('isLoggedIn', 'false');
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html?session=expired';
            }
            return false;
        }
    } catch (e) {
        console.error('Session refresh network error:', e);
        return false;
    } finally {
        isRefreshing = false;
    }
}

// ==================== CREATE PENDING SUBSCRIPTION ====================
async function createPendingSubscription(planType, paymentGuid) {
    try {
        const sessionStr = localStorage.getItem('supabase_session');
        if (!sessionStr) throw new Error('No session found');
        const session = JSON.parse(sessionStr);
        let accessToken = session.access_token;
        const userId = session.user?.id;
        if (!userId) throw new Error('No user ID');

        let checkResp = await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions?seller_id=eq.${userId}&select=id`, {
            headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}` }
        });
        if (checkResp.status === 401) {
            const refreshed = await refreshSession();
            if (!refreshed) return false;
            const newSession = JSON.parse(localStorage.getItem('supabase_session'));
            accessToken = newSession.access_token;
            checkResp = await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions?seller_id=eq.${userId}&select=id`, {
                headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}` }
            });
        }

        const existing = checkResp.ok ? await checkResp.json() : [];

        const subData = {
            seller_id: String(userId),
            plan_type: planType,
            status: 'pending',
            payment_status: 'pending',
            auto_renew: true,
            paynow_reference: paymentGuid,
            current_period_start: null,
            current_period_end: null
        };

        let result = false;
        if (existing && existing.length > 0) {
            const updateResp = await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions?id=eq.${existing[0].id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}`, 'Prefer': 'return=minimal' },
                body: JSON.stringify(subData)
            });
            if (updateResp.ok) result = true;
        } else {
            const insertResp = await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}`, 'Prefer': 'return=minimal' },
                body: JSON.stringify(subData)
            });
            if (insertResp.ok) result = true;
        }

        if (result) {
            console.log('Pending subscription created/updated for plan ' + planType + ' with GUID ' + paymentGuid);
            return true;
        } else {
            throw new Error('Failed to create pending subscription');
        }
    } catch (e) {
        console.error('Error creating pending subscription:', e);
        showToast('Failed to initialize subscription. Please try again.', true);
        return false;
    }
}

// ==================== ACTIVATE SUBSCRIPTION ====================
async function activateSubscription(planType, reference) {
    try {
        const plan = tierMap[planType];
        const sessionStr = localStorage.getItem('supabase_session');
        if (!sessionStr) throw new Error('No session found');
        const session = JSON.parse(sessionStr);
        let accessToken = session.access_token;
        const userId = session.user?.id;
        if (!userId) throw new Error('No user ID');

        console.log('Activating subscription for user:', userId, 'plan:', planType, 'ref:', reference);

        let findResp = await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions?seller_id=eq.${userId}&paynow_reference=eq.${reference}&select=id`, {
            headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}` }
        });
        if (findResp.status === 401) {
            const refreshed = await refreshSession();
            if (!refreshed) throw new Error('Session refresh failed');
            const newSession = JSON.parse(localStorage.getItem('supabase_session'));
            accessToken = newSession.access_token;
            findResp = await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions?seller_id=eq.${userId}&paynow_reference=eq.${reference}&select=id`, {
                headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}` }
            });
        }

        let subId = null;
        if (findResp.ok) {
            const data = await findResp.json();
            if (data && data.length > 0) {
                subId = data[0].id;
            }
        }

        const updateData = {
            plan_type: planType,
            status: 'active',
            payment_status: 'completed',
            auto_renew: true,
            paynow_reference: reference,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 2592000000).toISOString()
        };

        let updateSuccess = false;
        if (subId) {
            const updateResp = await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions?id=eq.${subId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}`, 'Prefer': 'return=minimal' },
                body: JSON.stringify(updateData)
            });
            if (updateResp.ok) updateSuccess = true;
        } else {
            const insertResp = await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}`, 'Prefer': 'return=minimal' },
                body: JSON.stringify({
                    seller_id: String(userId),
                    ...updateData
                })
            });
            if (insertResp.ok) updateSuccess = true;
        }

        if (!updateSuccess) throw new Error('Failed to activate subscription');

        currentTier = planType;
        subscriptionStatus = 'active';
        autoRenew = true;
        subscriptionExpiry = new Date(Date.now() + 2592000000).toISOString();
        currentSellerId = userId;
        localStorage.setItem(`mbare_tier_${userId}`, currentTier);
        localStorage.removeItem('pending_payment_plan');
        localStorage.removeItem('pending_payment_guid');

        await loadProductsFromSupabase();
        renderTiers();
        enforceProductLimit();
        updateStatsAndLimits();
        updateExpiryBanner();
        updateSubscriptionControls();
        renderProducts();

        showToast('SUCCESS! ' + plan.name + ' activated!', false);
    } catch (error) {
        console.error('Activation error:', error);
        showToast('Activation failed. Please refresh and try again.', true);
    }
}

// ==================== PAYMENT FLOW (FOLLOWS DOCUMENTATION WORKFLOW) ====================
async function openPayNowPayment(planType) {
    const plan = tierMap[planType];
    
    try {
        const sessionStr = localStorage.getItem('supabase_session');
        if (!sessionStr) throw new Error('No active user session found.');
        const session = JSON.parse(sessionStr);
        
        const sellerId = session.user?.id;
        const sellerEmail = session.user?.email;
        const targetAmount = parseFloat(plan.amount);

        if (!sellerId || !sellerEmail) {
            alert("Session authentication error. Please re-login.");
            return;
        }

        showToast('Connecting to Paynow gateway securely...', false);

        // ============================================================
        // STEP 1: Server initiates the transaction using Paynow SDK
        // This follows the official documentation workflow
        // ============================================================
        const response = await fetch(`${API_BASE_URL}/initiate-subscription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sellerId: sellerId,
                sellerEmail: sellerEmail,
                amount: targetAmount,
                planType: planType
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to initiate secure token connection.');
        }

        // ============================================================
        // STEP 2: Server has created the payment and returned the redirect URL
        // Save pending info and redirect the user to Paynow
        // ============================================================
        localStorage.setItem('pending_payment_plan', planType);
        localStorage.setItem('pending_payment_guid', data.reference);

        showToast('Redirecting to Paynow checkout portal...', false);

        // ============================================================
        // STEP 3: Redirect to Paynow using the URL from the server
        // This follows the documentation: "Get the link to redirect the user to"
        // ============================================================
        window.location.href = data.redirectUrl;

    } catch (e) {
        console.error('Payment initialization error:', e);
        alert('Payment initiation failure: ' + e.message);
    }
}

// ==================== CHECK PAYMENT STATUS (Polling fallback) ====================
function checkLocalStoragePaymentStatus() {
    const pendingPlan = localStorage.getItem('pending_payment_plan');
    const pendingGuid = localStorage.getItem('pending_payment_guid');

    // Check if user returned from Paynow
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get('payment');

    if (pendingPlan && pendingGuid && (statusParam === 'return' || statusParam === 'success')) {
        showToast('Processing payment...', false);
        
        // Start polling the server for status
        pollPaymentStatus(pendingGuid, pendingPlan);
        return true;
    }
    return false;
}

async function pollPaymentStatus(reference, planType, attempt = 0) {
    const maxAttempts = 30; // 30 * 3 seconds = 90 seconds max
    const delay = 3000; // 3 seconds between attempts
    
    try {
        console.log(`Checking payment status (attempt ${attempt + 1}/${maxAttempts})...`);
        
        const response = await fetch(`${API_BASE_URL}/payment-status/${reference}`);
        
        if (response.status === 404) {
            // Payment not found yet - keep polling
            if (attempt < maxAttempts) {
                showToast('Waiting for payment confirmation...', false);
                setTimeout(() => pollPaymentStatus(reference, planType, attempt + 1), delay);
            } else {
                showToast('Payment timed out. Please contact support.', true);
                localStorage.removeItem('pending_payment_plan');
                localStorage.removeItem('pending_payment_guid');
            }
            return;
        }
        
        const data = await response.json();
        
        if (data.status === 'active') {
            // Payment confirmed!
            showToast('Payment confirmed! Activating subscription...', false);
            await activateSubscription(planType, reference);
        } else if (data.status === 'pending') {
            // Still waiting
            if (attempt < maxAttempts) {
                setTimeout(() => pollPaymentStatus(reference, planType, attempt + 1), delay);
            } else {
                showToast('Payment still processing. Please refresh later.', true);
            }
        } else {
            showToast('Payment failed. Please try again.', true);
            localStorage.removeItem('pending_payment_plan');
            localStorage.removeItem('pending_payment_guid');
        }
        
    } catch (error) {
        console.error('Polling error:', error);
        if (attempt < maxAttempts) {
            setTimeout(() => pollPaymentStatus(reference, planType, attempt + 1), delay);
        } else {
            showToast('Error checking payment status. Please contact support.', true);
        }
    }
}

// ==================== AUTH ====================
async function checkAuth() {
    const sessionStr = localStorage.getItem('supabase_session');
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!loggedIn || !sessionStr) {
        alert('Please login first.');
        window.location.href = 'login.html?redirect=seller-dashboard.html';
        return false;
    }
    try {
        const session = JSON.parse(sessionStr);
        currentSellerId = session.user?.id;
        currentAccessToken = session.access_token;
        if (!currentSellerId || !currentAccessToken) throw new Error('Invalid session data');
        document.querySelector('.account-menu').textContent = 'Hello, ' + (session.user?.email || 'Seller').split('@')[0];
        updateViewShopButton();
        await loadSellerProfile(1);
        return true;
    } catch (e) {
        console.error('Auth check error:', e);
        localStorage.removeItem('supabase_session');
        localStorage.setItem('isLoggedIn', 'false');
        window.location.href = 'login.html';
        return false;
    }
}

function updateViewShopButton() {
    const viewShopBtn = document.getElementById('viewShopBtn');
    if (viewShopBtn && currentSellerId) {
        viewShopBtn.href = `shop.html?seller=${currentSellerId}`;
        console.log('View Shop button updated to:', viewShopBtn.href);
    }
}

// ==================== SELLER PROFILE ====================
let currentSellerProfile = null;

async function loadSellerProfile(retries = 1) {
    try {
        const session = JSON.parse(localStorage.getItem('supabase_session'));
        const token = session?.access_token || currentAccessToken;
        const resp = await fetch(`${window.SUPABASE_URL}/rest/v1/sellers?user_id=eq.${currentSellerId}&select=*`, {
            headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
        });
        if (resp.ok) {
            const sellers = await resp.json();
            if (sellers && sellers.length > 0) {
                currentSellerProfile = sellers[0];
                updateProfileUI();
                loadLocationData();
            }
        } else if (resp.status === 401 && retries > 0) {
            console.log('Profile fetch 401, trying refresh...');
            const refreshed = await refreshSession();
            if (refreshed) {
                await loadSellerProfile(0);
            } else {
                return;
            }
        } else {
            console.error('Profile load failed:', resp.status);
        }
    } catch (e) {
        console.error('Error loading profile:', e);
    }
}

function updateProfileUI() {
    if (!currentSellerProfile) return;
    const profileImg = document.getElementById('profileAvatarImg');
    const placeholder = document.getElementById('profilePlaceholder');
    const status = document.getElementById('profileStatus');
    if (currentSellerProfile.profile_image) {
        profileImg.src = currentSellerProfile.profile_image;
        profileImg.style.display = 'block';
        placeholder.style.display = 'none';
        status.textContent = 'Profile photo uploaded';
    } else {
        profileImg.style.display = 'none';
        placeholder.style.display = 'flex';
        status.textContent = 'No profile photo uploaded. Please upload a photo.';
    }
    const coverPreview = document.getElementById('coverPreview');
    const coverPlaceholder = document.getElementById('coverPlaceholder');
    const coverStatus = document.getElementById('coverStatus');
    if (currentSellerProfile.cover_image) {
        coverPreview.src = currentSellerProfile.cover_image;
        coverPreview.style.display = 'block';
        coverPlaceholder.style.display = 'none';
        coverStatus.textContent = 'Cover image uploaded';
    } else {
        coverPreview.style.display = 'none';
        coverPlaceholder.style.display = 'block';
        coverStatus.textContent = 'No cover image uploaded. Please upload a cover image.';
    }
    const descInput = document.getElementById('shopDescription');
    if (descInput && currentSellerProfile.shop_description) {
        descInput.value = currentSellerProfile.shop_description;
    }
}

async function handleProfileImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.match('image.*')) { alert('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.getElementById('profileAvatarImg');
        const placeholder = document.getElementById('profilePlaceholder');
        img.src = e.target.result;
        img.style.display = 'block';
        placeholder.style.display = 'none';
        document.getElementById('profileStatus').textContent = 'Uploading...';
    };
    reader.readAsDataURL(file);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', IMGBB_API_KEY);
    try {
        const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
            const imageUrl = data.data.url;
            const session = JSON.parse(localStorage.getItem('supabase_session'));
            const token = session?.access_token || currentAccessToken;
            await fetch(`${window.SUPABASE_URL}/rest/v1/sellers?user_id=eq.${currentSellerId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}`, 'Prefer': 'return=minimal' },
                body: JSON.stringify({ profile_image: imageUrl })
            });
            document.getElementById('profileStatus').textContent = 'Profile photo uploaded successfully!';
            showToast('Profile photo updated!');
            if (currentSellerProfile) currentSellerProfile.profile_image = imageUrl;
        } else {
            throw new Error(data.error?.message || 'Upload failed');
        }
    } catch (error) {
        alert('Failed to upload image: ' + error.message);
        document.getElementById('profileStatus').textContent = 'Upload failed. Please try again.';
    }
}

async function handleCoverImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.match('image.*')) { alert('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.getElementById('coverPreview');
        const placeholder = document.getElementById('coverPlaceholder');
        img.src = e.target.result;
        img.style.display = 'block';
        placeholder.style.display = 'none';
        document.getElementById('coverStatus').textContent = 'Uploading...';
    };
    reader.readAsDataURL(file);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', IMGBB_API_KEY);
    try {
        const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
            const imageUrl = data.data.url;
            const session = JSON.parse(localStorage.getItem('supabase_session'));
            const token = session?.access_token || currentAccessToken;
            await fetch(`${window.SUPABASE_URL}/rest/v1/sellers?user_id=eq.${currentSellerId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}`, 'Prefer': 'return=minimal' },
                body: JSON.stringify({ cover_image: imageUrl })
            });
            document.getElementById('coverStatus').textContent = 'Cover image uploaded successfully!';
            showToast('Cover image updated!');
            if (currentSellerProfile) currentSellerProfile.cover_image = imageUrl;
        } else {
            throw new Error(data.error?.message || 'Upload failed');
        }
    } catch (error) {
        alert('Failed to upload cover image: ' + error.message);
        document.getElementById('coverStatus').textContent = 'Upload failed. Please try again.';
    }
}

async function removeCoverImage() {
    if (!confirm('Remove cover image?')) return;
    try {
        const session = JSON.parse(localStorage.getItem('supabase_session'));
        const token = session?.access_token || currentAccessToken;
        await fetch(`${window.SUPABASE_URL}/rest/v1/sellers?user_id=eq.${currentSellerId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}`, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ cover_image: null })
        });
        if (currentSellerProfile) currentSellerProfile.cover_image = null;
        document.getElementById('coverPreview').style.display = 'none';
        document.getElementById('coverPlaceholder').style.display = 'block';
        document.getElementById('coverStatus').textContent = 'Cover image removed';
        showToast('Cover image removed');
    } catch (e) { alert('Failed to remove cover image'); }
}

// ==================== LOCATION PICKER ====================
let locationMap, locationMarker;
let isMapInitialized = false;
let searchTimeout = null;

function initLocationPicker() {
    if (isMapInitialized) return;

    const mapDiv = document.getElementById('profile-map');
    if (!mapDiv) {
        console.warn('Profile map container not found');
        return;
    }

    const savedLat = parseFloat(document.getElementById('seller_lat').value) || -17.8252;
    const savedLng = parseFloat(document.getElementById('seller_lng').value) || 31.0335;
    const center = { lat: savedLat, lng: savedLng };

    locationMap = L.map('profile-map').setView([center.lat, center.lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(locationMap);

    locationMarker = L.marker([center.lat, center.lng], {
        draggable: true
    }).addTo(locationMap);

    locationMarker.on('dragend', function() {
        const pos = locationMarker.getLatLng();
        document.getElementById('seller_lat').value = pos.lat;
        document.getElementById('seller_lng').value = pos.lng;
        reverseGeocode(pos.lat, pos.lng);
    });

    const searchInput = document.getElementById('location-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            if (query.length < 3) return;

            searchTimeout = setTimeout(() => {
                searchLocation(query);
            }, 500);
        });

        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(searchTimeout);
                const query = this.value.trim();
                if (query.length >= 3) {
                    searchLocation(query);
                }
            }
        });
    }

    isMapInitialized = true;
    console.log('Location picker initialized with Leaflet (free).');
}

async function searchLocation(query) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=zw`
        );
        const data = await response.json();

        if (data && data.length > 0) {
            const result = data[0];
            const lat = parseFloat(result.lat);
            const lon = parseFloat(result.lon);

            locationMap.setView([lat, lon], 15);
            locationMarker.setLatLng([lat, lon]);

            document.getElementById('seller_lat').value = lat;
            document.getElementById('seller_lng').value = lon;
            document.getElementById('seller_display_name').value = result.display_name;
            document.getElementById('location-search').value = result.display_name;

            showToast('Location found: ' + result.display_name);
        } else {
            showToast('No location found. Please try a different search.', true);
        }
    } catch (error) {
        console.error('Search error:', error);
        showToast('Error searching for location. Please try again.', true);
    }
}

async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`
        );
        const data = await response.json();

        if (data && data.display_name) {
            document.getElementById('seller_display_name').value = data.display_name;
            document.getElementById('location-search').value = data.display_name;
        }
    } catch (error) {
        console.error('Reverse geocode error:', error);
    }
}

function loadLocationData() {
    const profile = currentSellerProfile;
    if (!profile) return;
    if (profile.latitude) {
        const lat = parseFloat(profile.latitude);
        const lng = parseFloat(profile.longitude);
        document.getElementById('seller_lat').value = lat;
        document.getElementById('seller_lng').value = lng;
        document.getElementById('seller_display_name').value = profile.location_display_name || '';
        document.getElementById('location-search').value = profile.location_display_name || '';

        if (isMapInitialized && locationMarker) {
            locationMarker.setLatLng([lat, lng]);
            locationMap.setView([lat, lng], 13);
        }
    }
}

function toggleProfileForm() {
    const section = document.getElementById('profileSection');
    const btn = document.getElementById('toggleProfileBtn');
    if (section.style.display === 'none') {
        section.style.display = 'block';
        btn.textContent = 'Close Profile';
        btn.style.background = '#dc3545';
        setTimeout(() => {
            if (!isMapInitialized) {
                initLocationPicker();
            } else {
                setTimeout(() => {
                    locationMap.invalidateSize();
                    const lat = parseFloat(document.getElementById('seller_lat').value) || -17.8252;
                    const lng = parseFloat(document.getElementById('seller_lng').value) || 31.0335;
                    locationMap.setView([lat, lng], 13);
                    locationMarker.setLatLng([lat, lng]);
                }, 100);
            }
            loadLocationData();
        }, 300);
    } else {
        section.style.display = 'none';
        btn.textContent = 'Edit Profile';
        btn.style.background = '#6c757d';
    }
}

async function saveShopProfile() {
    const description = document.getElementById('shopDescription').value.trim();
    const latitude = document.getElementById('seller_lat').value;
    const longitude = document.getElementById('seller_lng').value;
    const locationDisplay = document.getElementById('seller_display_name').value;

    const searchVal = document.getElementById('location-search').value.trim();
    if (searchVal && (!latitude || !longitude)) {
        if (!confirm('You searched for a location but did not select it from the dropdown. The location will not be saved. Continue?')) {
            return;
        }
    }

    try {
        const session = JSON.parse(localStorage.getItem('supabase_session'));
        const token = session?.access_token || currentAccessToken;
        await fetch(`${window.SUPABASE_URL}/rest/v1/sellers?user_id=eq.${currentSellerId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}`, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ 
                shop_description: description,
                latitude: latitude || null,
                longitude: longitude || null,
                location_display_name: locationDisplay || null
            })
        });
        if (currentSellerProfile) {
            currentSellerProfile.shop_description = description;
            currentSellerProfile.latitude = latitude;
            currentSellerProfile.longitude = longitude;
            currentSellerProfile.location_display_name = locationDisplay;
        }
        showToast('Shop profile saved successfully!');
    } catch (e) {
        alert('Failed to save shop profile: ' + e.message);
    }
}

// ==================== SUBSCRIPTION FUNCTIONS ====================
async function fetchSubscription(retries = 1) {
    try {
        const session = JSON.parse(localStorage.getItem('supabase_session'));
        const token = session?.access_token || currentAccessToken;
        const resp = await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions?seller_id=eq.${currentSellerId}&select=*&order=created_at.desc&limit=1`, {
            headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
        });
        if (resp.ok) {
            const subs = await resp.json();
            if (subs?.length > 0) {
                const s = subs[0];
                subscriptionStatus = s.status || 'inactive';
                autoRenew = s.auto_renew !== false;
                if (s.current_period_end) {
                    subscriptionExpiry = s.current_period_end;
                    if (new Date(s.current_period_end) < new Date() && s.status === 'active') {
                        await updateSubscriptionStatus(s.id, 'expired');
                        subscriptionStatus = 'expired';
                        handleExpiredSubscription();
                        return null;
                    }
                }
                if (s.status === 'active' || s.status === 'paused') {
                    if (s.plan_type === 'tier_5') return 'tier_5';
                    if (s.plan_type === 'tier_150') return 'tier_150';
                }
            }
            return null;
        } else if (resp.status === 401 && retries > 0) {
            console.log('Subscription fetch 401, trying refresh...');
            const refreshed = await refreshSession();
            if (refreshed) {
                return fetchSubscription(0);
            } else {
                return null;
            }
        } else {
            console.error('Subscription fetch failed:', resp.status);
            return null;
        }
    } catch (e) {
        console.error('Error fetching subscription:', e);
        return null;
    }
}

async function updateSubscriptionStatus(sid, st) {
    try {
        const session = JSON.parse(localStorage.getItem('supabase_session'));
        const token = session?.access_token || currentAccessToken;
        await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions?id=eq.${sid}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}`, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ status: st })
        });
    } catch (e) {}
}

function handleExpiredSubscription() {
    const max = 8;
    sellerProducts.forEach((p, i) => {
        p.paused = (i >= max);
    });
    currentTier = 'free';
    subscriptionStatus = 'expired';
    localStorage.setItem(`mbare_tier_${currentSellerId}`, 'free');
    saveProductsLocal();
    renderTiers();
    renderProducts();
    updateStatsAndLimits();
    updateExpiryBanner();
    updateSubscriptionControls();
}

async function pauseSubscription() {
    if (!confirm('Pause subscription?')) return;
    try {
        const resp = await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions?seller_id=eq.${currentSellerId}&select=id`, {
            headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${currentAccessToken}` }
        });
        const subs = resp.ok ? await resp.json() : [];
        if (subs?.length > 0) {
            await updateSubscriptionStatus(subs[0].id, 'paused');
        }
        subscriptionStatus = 'paused';
        autoRenew = false;
        updateExpiryBanner();
        updateSubscriptionControls();
        alert('Subscription paused.');
    } catch (e) { alert('Error.'); }
}

async function resumeSubscription() {
    if (!confirm('Resume auto-renewal?')) return;
    try {
        const resp = await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions?seller_id=eq.${currentSellerId}&select=id`, {
            headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${currentAccessToken}` }
        });
        const subs = resp.ok ? await resp.json() : [];
        if (subs?.length > 0) {
            await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions?id=eq.${subs[0].id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${currentAccessToken}`, 'Prefer': 'return=minimal' },
                body: JSON.stringify({ status: 'active', auto_renew: true })
            });
        }
        subscriptionStatus = 'active';
        autoRenew = true;
        updateExpiryBanner();
        updateSubscriptionControls();
        alert('Auto-renewal resumed!');
    } catch (e) { alert('Error.'); }
}

function updateExpiryBanner() {
    const b = document.getElementById('expiryBanner');
    if (!b) return;
    if (!subscriptionExpiry || currentTier === 'free') {
        if (subscriptionStatus === 'expired') {
            b.className = 'expiry-banner expired';
            b.innerHTML = 'Expired. <a href="#" id="renewLink" class="inline-link">Renew</a>';
            b.style.display = 'block';
            document.getElementById('renewLink')?.addEventListener('click', (e) => { e.preventDefault(); showUpgradeOptions(); });
        } else {
            b.style.display = 'none';
        }
        return;
    }
    const daysLeft = Math.ceil((new Date(subscriptionExpiry) - new Date()) / (86400000));
    if (daysLeft <= 0) {
        b.className = 'expiry-banner expired';
        b.innerHTML = 'Expired! <a href="#" id="renewLink" class="inline-link">Renew</a>';
        b.style.display = 'block';
        document.getElementById('renewLink')?.addEventListener('click', (e) => { e.preventDefault(); showUpgradeOptions(); });
    } else if (daysLeft <= 5) {
        b.className = 'expiry-banner warning';
        b.innerHTML = `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}! <a href="#" id="renewLink" class="inline-link">Renew</a>`;
        b.style.display = 'block';
        document.getElementById('renewLink')?.addEventListener('click', (e) => { e.preventDefault(); showUpgradeOptions(); });
    } else {
        b.className = 'expiry-banner info';
        b.innerHTML = `${tierMap[currentTier]?.name} - ${daysLeft} days left`;
        b.style.display = 'block';
    }
}

function updateSubscriptionControls() {
    const c = document.getElementById('subscriptionControls');
    if (!c) return;
    if (currentTier === 'free') {
        c.style.display = 'none';
        return;
    }
    c.style.display = 'block';
    if (subscriptionStatus === 'paused') {
        c.innerHTML = '<button class="btn-primary" onclick="resumeSubscription()">Resume Auto-Renewal</button>';
    } else if (subscriptionStatus === 'expired') {
        c.innerHTML = '<button class="btn-primary" onclick="showUpgradeOptions()">Renew Subscription</button>';
    } else {
        c.innerHTML = '<button class="btn-danger" onclick="pauseSubscription()">Pause Subscription</button><br><small>Current period remains active until expiry.</small>';
    }
}

// ==================== PRODUCT FUNCTIONS ====================
async function loadProductsFromSupabase(retries = 1) {
    try {
        const session = JSON.parse(localStorage.getItem('supabase_session'));
        const token = session?.access_token || currentAccessToken;
        const r = await fetch(`${window.SUPABASE_URL}/rest/v1/products?seller_id=eq.${currentSellerId}&select=*&order=created_at.desc`, {
            headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
        });
        if (r.ok) {
            sellerProducts = await r.json();
            sellerProducts.forEach(p => { if (p.paused === undefined) p.paused = false; });
            return true;
        } else if (r.status === 401 && retries > 0) {
            console.log('Products fetch 401, trying refresh...');
            const refreshed = await refreshSession();
            if (refreshed) {
                return loadProductsFromSupabase(0);
            } else {
                return false;
            }
        } else {
            console.error('Products fetch failed:', r.status);
            return false;
        }
    } catch (e) {
        console.error('Error loading products:', e);
        return false;
    }
}

async function saveProductToSupabase(pd) {
    const session = JSON.parse(localStorage.getItem('supabase_session'));
    const token = session?.access_token || currentAccessToken;
    const r = await fetch(`${window.SUPABASE_URL}/rest/v1/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}`, 'Prefer': 'return=representation' },
        body: JSON.stringify({
            seller_id: String(currentSellerId),
            title: pd.title,
            description: pd.description || '',
            price: pd.price,
            category: pd.category,
            stock: pd.stock,
            image_url: pd.image_url,
            paused: pd.paused || false,
            created_at: new Date().toISOString()
        })
    });
    if (r.ok) return await r.json();
    throw new Error((await r.json()).message || 'Save failed');
}

async function deleteProductFromSupabase(id) {
    const session = JSON.parse(localStorage.getItem('supabase_session'));
    const token = session?.access_token || currentAccessToken;
    return (await fetch(`${window.SUPABASE_URL}/rest/v1/products?id=eq.${id}&seller_id=eq.${currentSellerId}`, {
        method: 'DELETE',
        headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
    })).ok;
}

async function updateProductPausedStatus(productId, paused) {
    const session = JSON.parse(localStorage.getItem('supabase_session'));
    const token = session?.access_token || currentAccessToken;
    await fetch(`${window.SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ paused: paused })
    });
}

async function uploadImageToImgBB(file) {
    const bar = document.getElementById('uploadProgressBar'), fill = document.getElementById('uploadProgressFill');
    bar.style.display = 'block'; fill.style.width = '30%';
    const fd = new FormData(); fd.append('image', file); fd.append('key', IMGBB_API_KEY);
    const resp = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: fd });
    fill.style.width = '80%';
    const data = await resp.json();
    if (data.success) { fill.style.width = '100%'; setTimeout(() => bar.style.display = 'none', 1000); return data.data.url; }
    throw new Error(data.error?.message || 'Upload failed');
}

function loadProducts() {
    loadProductsFromSupabase().then(ok => {
        if (!ok) { sellerProducts = JSON.parse(localStorage.getItem(`mbare_products_${currentSellerId}`) || '[]'); }
        enforceProductLimit();
        renderProducts();
        updateStatsAndLimits();
    });
}

function saveProductsLocal() {
    localStorage.setItem(`mbare_products_${currentSellerId}`, JSON.stringify(sellerProducts));
}

// ==================== RENDER FUNCTIONS ====================
function renderTiers() {
    const c = document.getElementById('tierContainer');
    if (!c) {
        console.error('tierContainer element not found!');
        const parent = document.querySelector('.grid-3.mb-30');
        if (parent) {
            parent.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#999;">Subscription plans will appear here.</div>';
        }
        return;
    }
    console.log('Rendering tiers with currentTier:', currentTier);
    c.innerHTML = '';
    for (const [k, d] of Object.entries(tierMap)) {
        const isCurrent = currentTier === k;
        const isDowngrade = currentTier !== 'free' && k !== 'free' && d.level < tierMap[currentTier]?.level;
        const isDisabled = isCurrent || isDowngrade;
        let buttonText = isCurrent ? (subscriptionStatus === 'paused' ? 'Paused' : 'Current Plan') :
                         (isDowngrade ? 'Cannot Downgrade' : 'Subscribe');

        c.innerHTML += `<div class="tier-card ${isCurrent ? 'tier-highlight' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong style="font-size:1.2rem;">${d.name}</strong>
                ${d.badge ? `<span class="badge-pro">${d.badge}</span>` : ''}
                ${isCurrent && subscriptionStatus === 'paused' ? '<span class="badge-paused">PAUSED</span>' : ''}
            </div>
            <div class="tier-price">${d.price}</div>
            <div style="font-size:13px;margin:8px 0;">${d.perks}</div>
            <div style="font-size:12px;background:#f4f5f7;padding:5px;border-radius:30px;">Max: ${d.maxProducts} products</div>
            <button class="btn-primary subscribe-btn" data-tier="${k}" style="margin-top:18px;width:100%;" ${isDisabled ? 'disabled' : ''}>
                ${buttonText}
            </button>
        </div>`;
    }
    document.querySelectorAll('.subscribe-btn').forEach(b => {
        b.addEventListener('click', () => {
            const t = b.dataset.tier;
            if (t === 'free') {
                if (currentTier !== 'free' && subscriptionStatus !== 'expired') return alert('Wait for expiry.');
                if (confirm('Switch to Free?')) {
                    currentTier = 'free';
                    localStorage.setItem(`mbare_tier_${currentSellerId}`, 'free');
                    fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions?seller_id=eq.${currentSellerId}&select=id`, {
                        headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${currentAccessToken}` }
                    }).then(r => r.json()).then(subs => {
                        if (subs && subs.length > 0) {
                            updateSubscriptionStatus(subs[0].id, 'cancelled');
                        }
                    });
                    renderTiers();
                    enforceProductLimit();
                    updateStatsAndLimits();
                    updateExpiryBanner();
                    updateSubscriptionControls();
                }
            } else {
                openPayNowPayment(t);
            }
        });
    });
}

function enforceProductLimit() {
    const max = getCurrentLimit();
    let pausedCount = 0;
    sellerProducts.forEach(p => {
        if (subscriptionStatus !== 'expired') {
            p.paused = false;
        }
    });
    const activeProducts = sellerProducts.filter(p => !p.paused);
    if (activeProducts.length > max) {
        const toPause = activeProducts
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
            .slice(0, activeProducts.length - max);
        toPause.forEach(p => {
            p.paused = true;
            pausedCount++;
        });
        toPause.forEach(async (p) => {
            await updateProductPausedStatus(p.id, true);
        });
    }
    if (pausedCount > 0) {
        console.log('Products paused due to limit');
        saveProductsLocal();
        showToast('Some products have been paused because you exceeded your tier limit. Upgrade to activate them.', true);
    }
    updateStatsAndLimits();
    updateProductLimitBanner();
}

function getCurrentLimit() {
    return currentTier === 'free' ? 8 : (currentTier === 'tier_150' ? 50 : 200);
}

function updateProductLimitBanner() {
    const banner = document.getElementById('productLimitBanner');
    const activeCount = document.getElementById('activeCount');
    const maxCount = document.getElementById('maxCount');
    const tierName = document.getElementById('tierName');
    const active = sellerProducts.filter(p => !p.paused).length;
    const max = getCurrentLimit();
    const tier = tierMap[currentTier]?.name || 'Free';
    if (activeCount) activeCount.textContent = active;
    if (maxCount) maxCount.textContent = max;
    if (tierName) tierName.textContent = tier;
    if (active >= max && banner) {
        banner.style.display = 'block';
    } else if (banner) {
        banner.style.display = 'none';
    }
}

function updateStatsAndLimits() {
    const active = sellerProducts.filter(p => !p.paused).length;
    const paused = sellerProducts.filter(p => p.paused).length;
    const max = getCurrentLimit();
    const msg = document.getElementById('tierMessage');
    if (msg) {
        msg.innerHTML = currentTier === 'free' 
            ? `<strong>Free:</strong> ${active}/${max} active. ${paused > 0 ? paused + ' paused. ' : ''}${active < max ? (max - active) + ' slots available.' : 'Limit reached.'} <a href="#" id="upgradeLink" class="inline-link">Upgrade</a>`
            : `<strong>${tierMap[currentTier]?.name}:</strong> ${active} active, ${max - active} slots available. ${paused > 0 ? paused + ' paused.' : ''}`;
        const ul = document.getElementById('upgradeLink');
        if (ul) ul.onclick = e => { e.preventDefault(); showUpgradeOptions(); };
    }
    document.getElementById('totalProducts').innerText = active;
    document.getElementById('totalStock').innerText = sellerProducts.filter(p => !p.paused).reduce((s, p) => s + (p.stock || 0), 0);
    document.getElementById('totalValue').innerText = '$' + sellerProducts.filter(p => !p.paused).reduce((s, p) => s + ((p.price || 0) * (p.stock || 0)), 0).toFixed(2);
    const toggleBtn = document.getElementById('toggleFormBtn');
    if (toggleBtn) {
        toggleBtn.disabled = active >= max || subscriptionStatus === 'expired';
        toggleBtn.textContent = active >= max ? 'Limit Reached' : '+ Add Product';
    }
    updateProductLimitBanner();
}

function esc(s) { if (!s) return ''; return s.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]); }

function renderProducts() {
    const c = document.getElementById('productsList');
    if (!c) return;
    if (!sellerProducts.length) { c.innerHTML = '<p class="text-center" style="padding:40px;color:#666;">No products yet.</p>'; return; }
    c.innerHTML = sellerProducts.map(p => `
        <div class="product-card ${p.paused ? 'paused' : ''}">
            <img src="${p.image_url || 'https://placehold.co/400x300?text=No+Image'}" alt="${esc(p.title)}" onerror="this.src='https://placehold.co/400x300?text=No+Image'">
            <div class="product-info">
                <h3>${esc(p.title)}</h3>
                <div style="font-size:20px;font-weight:600;color:#B12704;">$${parseFloat(p.price || 0).toFixed(2)}</div>
                <div>Stock: ${p.stock || 0} | ${p.category || 'N/A'}${p.paused ? ' | PAUSED' : ''}</div>
                ${!p.paused ? '<button class="whatsapp-btn" onclick="whatsappInquiry(\'' + esc(p.title) + '\')">WhatsApp</button>' : '<div style="color:#dc3545;font-size:12px;">Paused - Limit Reached</div>'}
                <div style="display:flex;gap:8px;margin-top:8px;">
                    <button class="btn-secondary" style="flex:1;" onclick="editProduct('${p.id}')">Edit</button>
                    <button class="btn-delete" style="flex:1;" onclick="deleteProduct('${p.id}')">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

window.whatsappInquiry = function(t) { window.open('https://wa.me/?text=' + encodeURIComponent('Hello, interested in "' + t + '" on Mbare Marketplace.'), '_blank'); };

window.deleteProduct = async function(id) {
    if (!confirm('Delete this product?')) return;
    await deleteProductFromSupabase(id);
    sellerProducts = sellerProducts.filter(p => p.id !== id);
    saveProductsLocal();
    renderProducts();
    updateStatsAndLimits();
    enforceProductLimit();
};

window.editProduct = function(id) {
    const p = sellerProducts.find(x => x.id == id);
    if (!p) return;
    document.getElementById('prodTitle').value = p.title || '';
    document.getElementById('prodDescription').value = p.description || '';
    document.getElementById('prodPrice').value = p.price || '';
    document.getElementById('prodCategory').value = p.category || '';
    document.getElementById('prodStock').value = p.stock || '';
    document.getElementById('prodImage').value = p.image_url || '';
    if (p.image_url) { document.getElementById('imagePreview').src = p.image_url; document.getElementById('imagePreviewContainer').style.display = 'block'; document.getElementById('uploadPlaceholder').style.display = 'none'; }
    sellerProducts = sellerProducts.filter(x => x.id != id);
    saveProductsLocal();
    renderProducts();
    updateStatsAndLimits();
    document.getElementById('addProductForm').style.display = 'block';
    document.getElementById('toggleFormBtn').innerText = 'Cancel';
    document.getElementById('submitProductBtn').innerText = 'Update';
    document.getElementById('submitProductBtn').setAttribute('data-editing', 'true');
};

window.toggleProductForm = function() {
    const f = document.getElementById('addProductForm'), b = document.getElementById('toggleFormBtn');
    if (f.style.display === 'none' || f.style.display === '') {
        f.style.display = 'block';
        b.innerText = 'Cancel';
    } else {
        f.style.display = 'none';
        b.innerText = '+ Add Product';
        document.getElementById('productForm').reset();
        removeImage();
        document.getElementById('submitProductBtn').innerText = 'Add Product';
        document.getElementById('submitProductBtn').removeAttribute('data-editing');
    }
};

window.removeImage = function() {
    selectedImageFile = null;
    document.getElementById('imagePreview').src = '';
    document.getElementById('imagePreviewContainer').style.display = 'none';
    document.getElementById('uploadPlaceholder').style.display = 'block';
    document.getElementById('prodImage').value = '';
    document.getElementById('imageFileInput').value = '';
    document.getElementById('uploadProgressBar').style.display = 'none';
};

window.handleFileSelect = function(e) { if (e.target.files[0]) handleImageFile(e.target.files[0]); };

function handleImageFile(file) {
    if (!file.type.match('image.*')) return alert('Please select an image file');
    if (file.size > 10 * 1024 * 1024) return alert('Image must be under 10MB');
    selectedImageFile = file;
    const r = new FileReader();
    r.onload = function(e) {
        document.getElementById('imagePreview').src = e.target.result;
        document.getElementById('imagePreviewContainer').style.display = 'block';
        document.getElementById('uploadPlaceholder').style.display = 'none';
        document.getElementById('imageStatus').textContent = 'Image ready.';
    };
    r.readAsDataURL(file);
    document.getElementById('prodImage').value = '';
}

window.openCamera = function() {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = 'image/*';
    i.capture = 'environment';
    i.onchange = function(e) { if (e.target.files[0]) handleImageFile(e.target.files[0]); };
    i.click();
};

window.handleAddProduct = async function() {
    const ed = document.getElementById('submitProductBtn').getAttribute('data-editing');
    const activeProducts = sellerProducts.filter(p => !p.paused);
    const max = getCurrentLimit();
    if (!ed && activeProducts.length >= max) {
        alert(`Limit reached! You have ${activeProducts.length} active products out of ${max} allowed for your ${currentTier} plan. Please upgrade or delete some products.`);
        showUpgradeOptions();
        return;
    }
    const t = document.getElementById('prodTitle').value.trim();
    const pr = parseFloat(document.getElementById('prodPrice').value);
    const st = parseInt(document.getElementById('prodStock').value);
    const cat = document.getElementById('prodCategory').value;
    const desc = document.getElementById('prodDescription').value.trim();
    let img = document.getElementById('prodImage').value.trim();
    if (!t || isNaN(pr) || isNaN(st) || !cat) return alert('Please fill all required fields');
    const btn = document.getElementById('submitProductBtn');
    if (selectedImageFile) {
        btn.disabled = true; btn.innerText = 'Uploading...';
        try { img = await uploadImageToImgBB(selectedImageFile); } catch (e) {
            alert('Upload failed: ' + e.message);
            btn.disabled = false;
            btn.innerText = ed ? 'Update' : 'Add Product';
            return;
        }
    }
    if (!img) return alert('Please upload a product image');
    btn.disabled = true; btn.innerText = 'Saving...';
    const isPaused = (!ed && activeProducts.length >= max);
    const pd = { title: t, description: desc, price: pr, category: cat, stock: st, image_url: img, paused: isPaused };
    try {
        const sv = await saveProductToSupabase(pd);
        const newProduct = { id: sv?.[0]?.id || Date.now().toString(), ...pd };
        sellerProducts.unshift(newProduct);
        saveProductsLocal();
        renderProducts();
        updateStatsAndLimits();
        if (isPaused) {
            showToast('Product added but paused because you have reached your limit. Upgrade to activate it.', true);
            enforceProductLimit();
        } else {
            showToast('Product added successfully!');
        }
        toggleProductForm();
        document.getElementById('productForm').reset();
        removeImage();
        selectedImageFile = null;
        btn.disabled = false;
        btn.innerText = 'Add Product';
        btn.removeAttribute('data-editing');
    } catch (e) {
        alert('Failed to save product: ' + e.message);
        btn.disabled = false;
        btn.innerText = ed ? 'Update' : 'Add Product';
    }
};

(function() {
    const a = document.getElementById('uploadArea');
    if (!a) return;
    a.addEventListener('dragover', e => { e.preventDefault(); a.classList.add('dragover'); });
    a.addEventListener('dragleave', () => a.classList.remove('dragover'));
    a.addEventListener('drop', e => { e.preventDefault(); a.classList.remove('dragover'); if (e.dataTransfer.files.length > 0) handleImageFile(e.dataTransfer.files[0]); });
})();

// Analytics button with subscription check
const analyticsBtn = document.getElementById('analyticsNavBtn');
if (analyticsBtn) {
    analyticsBtn.addEventListener('click', () => {
        if (currentTier === 'free' || subscriptionStatus === 'expired' || subscriptionStatus === 'inactive') {
            alert('You need an active subscription to access analytics. Please subscribe first.');
            showUpgradeOptions();
            return;
        }
        window.location.href = 'seller-analytics.html';
    });
}

function startExpiryChecker() {
    if (renewalCheckInterval) clearInterval(renewalCheckInterval);
    renewalCheckInterval = setInterval(async () => {
        if (currentTier === 'free' || !subscriptionExpiry) return;
        if (new Date(subscriptionExpiry) < new Date() && subscriptionStatus === 'active') {
            handleExpiredSubscription();
        }
    }, 60000);
}

// ==================== SHOW UPGRADE OPTIONS ====================
function showUpgradeOptions() {
    const modalHtml = `
        <div class="payment-modal" id="upgradeModal">
            <div class="payment-card">
                <h3 style="text-align:center;">Choose Your Plan</h3>
                <div style="display:grid; gap:15px; margin:20px 0;">
                    <div class="tier-card" style="padding:15px;">
                        <strong>Merchant Basic</strong>
                        <div class="tier-price">$1.50<span style="font-size:14px;">/month</span></div>
                        <div>50 products limit</div>
                        <button class="btn-primary" style="margin-top:15px; width:100%;" onclick="closeModalAndPay('tier_150')">Subscribe - $1.50</button>
                    </div>
                    <div class="tier-card" style="padding:15px;">
                        <strong>Video Ads Plan</strong>
                        <div class="tier-price">$5.00<span style="font-size:14px;">/month</span></div>
                        <div>200 products + video ads</div>
                        <button class="btn-primary" style="margin-top:15px; width:100%;" onclick="closeModalAndPay('tier_5')">Subscribe - $5.00</button>
                    </div>
                </div>
                <button class="btn-secondary" id="closeUpgradeModal" style="width:100%;">Cancel</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('closeUpgradeModal').onclick = () => document.getElementById('upgradeModal')?.remove();
}

window.closeModalAndPay = function(planType) {
    document.getElementById('upgradeModal')?.remove();
    openPayNowPayment(planType);
};

// ==================== TOGGLE EVENT LISTENER ====================
document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('toggleProfileBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleProfileForm);
    }
});

// ==================== INIT ====================
async function init() {
    if (!await checkAuth()) return;
    console.log('Dashboard initializing...');
    try {
        // Check payment return
        checkLocalStoragePaymentStatus();
        // Fetch subscription (retries internally)
        const sub = await fetchSubscription(1);
        currentTier = sub || localStorage.getItem(`mbare_tier_${currentSellerId}`) || 'free';
        localStorage.setItem(`mbare_tier_${currentSellerId}`, currentTier);
        console.log('Current tier after init:', currentTier);
        // Load products
        await loadProductsFromSupabase(1);
        if (!sellerProducts.length) {
            sellerProducts = JSON.parse(localStorage.getItem(`mbare_products_${currentSellerId}`) || '[]');
        }
        // Render everything
        renderTiers();
        updateExpiryBanner();
        updateSubscriptionControls();
        enforceProductLimit();
        renderProducts();
        updateStatsAndLimits();
        startExpiryChecker();
        document.getElementById('loadingOverlay').style.display = 'none';
        updateViewShopButton();
        console.log('Dashboard fully initialized.');
    } catch (e) {
        console.error('Init error:', e);
        // Only redirect if session is missing
        if (!localStorage.getItem('supabase_session')) {
            window.location.href = 'login.html';
        }
    }
}

document.addEventListener('DOMContentLoaded', init);
