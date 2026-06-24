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

// ==================== REFRESH SESSION (with concurrency guard) ====================
async function refreshSession() {
    if (isRefreshing) {
        // Wait for the ongoing refresh to finish
        await new Promise(resolve => {
            const check = () => {
                if (!isRefreshing) resolve();
                else setTimeout(check, 200);
            };
            check();
        });
        // After waiting, check if we have a valid session now
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
            // Session is irrecoverable – clear and redirect
            localStorage.removeItem('supabase_session');
            localStorage.setItem('isLoggedIn', 'false');
            // Avoid redirecting if already on login page
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

// ==================== PAYMENT FLOW (UPDATED - VPS BACKEND) ====================
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

        // Contact your backend VPS API to safely compute parameters and signatures
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

        // Cache parameters to process callbacks upon return matching your verification systems
        localStorage.setItem('pending_payment_plan', planType);
        localStorage.setItem('pending_payment_guid', data.reference);

        showToast('Redirecting to Paynow checkout portal...', false);

        // INSTANT SEAMLESS DIRECT REDIRECTION MECHANISM
        window.location.href = data.redirectUrl;

    } catch (e) {
        console.error('Payment initialization error:', e);
        alert('Payment initiation failure: ' + e.message);
    }
}

// ==================== CHECK LOCALSTORAGE FOR PENDING PAYMENT ====================
function checkLocalStoragePaymentStatus() {
    // Check if user returned from standard Paynow redirection loops
    const pendingPlan = localStorage.getItem('pending_payment_plan');
    const pendingGuid = localStorage.getItem('pending_payment_guid');

    // Paynow return parameters check
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get('status');

    if (pendingPlan && pendingGuid && (statusParam === 'success' || !statusParam)) {
        showToast('Processing returning payment session status updates...', false);
        activateSubscription(pendingPlan, pendingGuid);
        return true;
    }
    return false;
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
        // Load profile – this will handle its own token refresh
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
                // refreshSession already redirected if needed
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

// ==================== LOCATION PICKER (FREE - Leaflet + OpenStreetMap) ====================
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

    // Get saved coordinates (default to Harare, Zimbabwe)
    const savedLat = parseFloat(document.getElementById('seller_lat').value) || -17.8252;
    const savedLng = parseFloat(document.getElementById('seller_lng').value) || 31.0335;
    const center = { lat: savedLat, lng: savedLng };

    // Initialize the map
    locationMap = L.map('profile-map').setView([center.lat, center.lng], 13);

    // Add OpenStreetMap tiles (completely free, no API key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(locationMap);

    // Add draggable marker
    locationMarker = L.marker([center.lat, center.lng], {
        draggable: true
    }).addTo(locationMap);

    // When marker is dragged, update hidden fields
    locationMarker.on('dragend', function() {
        const pos = locationMarker.getLatLng();
        document.getElementById('seller_lat').value = pos.lat;
        document.getElementById('seller_lng').value = pos.lng;
        // Reverse geocode to get address
        reverseGeocode(pos.lat, pos.lng);
    });

    // Setup search with debouncing (free Nominatim API)
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

        // Also handle Enter key
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

// Search using free Nominatim API (OpenStreetMap)
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

            // Move map and marker
            locationMap.setView([lat, lon], 15);
            locationMarker.setLatLng([lat, lon]);

            // Update hidden fields
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

// Reverse geocode using free Nominatim API
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

// ==================== TOGGLE PROFILE FORM ====================
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
                // Refresh map
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

// ==================== SAVE SHOP PROFILE ====================
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
            seller
