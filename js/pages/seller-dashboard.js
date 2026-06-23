// ==================== CONFIGURATION ====================
window.SUPABASE_URL = 'https://fnncerdxfhwlrdopswpx.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_qjN17tdmLu5yvp9iIUBEjg_ZDZCWMhK';
const IMGBB_API_KEY = '670ea8c38e955ebdfdf84a41489713bf';

// Your backend VPS Server Base URL
const API_BASE_URL = 'https://api.mbaremarketplace.com';

let currentSellerId = null, currentAccessToken = null;
let currentTier = 'free', subscriptionStatus = 'inactive', subscriptionExpiry = null, autoRenew = true;
let sellerProducts = [], selectedImageFile = null, renewalCheckInterval = null;
let isRefreshing = false;  

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
        if (!sessionStr) return false;
        const session = JSON.parse(sessionStr);
        const refreshToken = session.refresh_token;
        if (!refreshToken) return false;

        const response = await fetch(`${window.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (response.ok) {
            const newSession = await response.json();
            localStorage.setItem('supabase_session', JSON.stringify(newSession));
            currentAccessToken = newSession.access_token;
            return true;
        } else {
            localStorage.removeItem('supabase_session');
            localStorage.setItem('isLoggedIn', 'false');
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html?session=expired';
            }
            return false;
        }
    } catch (e) {
        return false;
    } finally {
        isRefreshing = false;
    }
}

// ==================== DYNAMIC VPS PAYMENT FLOW ====================
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

        showToast('Contacting payment gateway server...', false);

        // Talk to your VPS Server directly to process the initialization payload securely
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

        // Dynamic parameters returned directly by your server's successful SDK execution
        const paynowLink = data.redirectUrl;
        const paymentGuid = data.reference; 

        localStorage.setItem('pending_payment_plan', planType);
        localStorage.setItem('pending_payment_guid', paymentGuid);

        const modalHtml = `
            <div class="payment-modal" id="paynowModal">
                <div class="payment-card" style="text-align:center;">
                    <button style="float:right;background:none;border:none;font-size:24px;cursor:pointer;" onclick="closePaymentModal()">&times;</button>
                    <h3>${plan.name}</h3>
                    <div class="tier-price">$${plan.amount}<span style="font-size:14px;">/month</span></div>
                    <p>${plan.perks}</p>
                    <div style="margin:20px 0; padding:15px; background:#f0f9ff; border-radius:12px;">
                        <p><strong>Instructions:</strong></p>
                        <ol style="text-align:left; margin-left:20px;">
                            <li>Click PayNow button below</li>
                            <li>Select your chosen payment routing method (EcoCash/OneMoney/Cards)</li>
                            <li>Enter your credentials and approve payment authorization request</li>
                            <li>After payment completes, click "Return to Merchant Website"</li>
                        </ol>
                    </div>
                    <a href="${paynowLink}" target="_blank">
                        <img src='https://www.paynow.co.zw/Content/Buttons/Medium_buttons/button_pay-now_medium.png' style="cursor:pointer; border-radius:8px; max-width:200px;" />
                    </a>
                    <p style="font-size:12px; margin-top:15px;">After payment, click "Return to Merchant Website"</p>
                    <button class="btn-secondary" id="closePayModal" style="width:100%; margin-top:15px;">Cancel</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        window.closePaymentModal = function() {
            document.getElementById('paynowModal')?.remove();
            localStorage.removeItem('pending_payment_plan');
            localStorage.removeItem('pending_payment_guid');
        };

        document.getElementById('closePayModal').onclick = window.closePaymentModal;

    } catch (e) {
        console.error('Payment initialization error:', e);
        alert('Payment initiation failure: ' + e.message);
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
            if (data && data.length > 0) subId = data[0].id;
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
                headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify(updateData)
            });
            if (updateResp.ok) updateSuccess = true;
        } else {
            const insertResp = await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify({ seller_id: String(userId), ...updateData })
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

function checkLocalStoragePaymentStatus() {
    const paymentGuid = localStorage.getItem('payment_guid');
    const paymentSuccess = localStorage.getItem('payment_success');
    const paymentTransaction = localStorage.getItem('payment_transaction');
    const paymentAmount = localStorage.getItem('payment_amount');

    if ((paymentGuid || paymentTransaction) && paymentSuccess === 'true') {
        let planType = 'tier_150';
        if (paymentAmount === '5.00' || paymentAmount === '5') {
            planType = 'tier_5';
        }

        showToast('Payment detected! Activating subscription...', false);

        localStorage.removeItem('payment_guid');
        localStorage.removeItem('payment_success');
        localStorage.removeItem('payment_transaction');
        localStorage.removeItem('payment_amount');
        localStorage.removeItem('payment_cancelled');

        const ref = paymentTransaction || paymentGuid || 'paynow_' + Date.now();
        activateSubscription(planType, ref);
        return true;
    }

    if (localStorage.getItem('payment_cancelled') === 'true') {
        showToast('Payment was cancelled. No charges were made.', true);
        localStorage.removeItem('payment_cancelled');
        return false;
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
        await loadSellerProfile(1);
        return true;
    } catch (e) {
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
            const refreshed = await refreshSession();
            if (refreshed) await loadSellerProfile(0);
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
        status.textContent = 'No profile photo uploaded.';
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
        coverStatus.textContent = 'No cover image uploaded.';
    }
    const descInput = document.getElementById('shopDescription');
    if (descInput && currentSellerProfile.shop_description) {
        descInput.value = currentSellerProfile.shop_description;
    }
}

async function handleProfileImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', IMGBB_API_KEY);
    try {
        const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
            const imageUrl = data.data.url;
            const token = JSON.parse(localStorage.getItem('supabase_session'))?.access_token || currentAccessToken;
            await fetch(`${window.SUPABASE_URL}/rest/v1/sellers?user_id=eq.${currentSellerId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ profile_image: imageUrl })
            });
            updateProfileUI();
            showToast('Profile photo updated!');
        }
    } catch (error) {
        alert('Failed to upload image');
    }
}

async function handleCoverImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', IMGBB_API_KEY);
    try {
        const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
            const imageUrl = data.data.url;
            const token = JSON.parse(localStorage.getItem('supabase_session'))?.access_token || currentAccessToken;
            await fetch(`${window.SUPABASE_URL}/rest/v1/sellers?user_id=eq.${currentSellerId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ cover_image: imageUrl })
            });
            updateProfileUI();
            showToast('Cover image updated!');
        }
    } catch (error) {
        alert('Failed to upload cover image');
    }
}

async function removeCoverImage() {
    if (!confirm('Remove cover image?')) return;
    try {
        const token = JSON.parse(localStorage.getItem('supabase_session'))?.access_token || currentAccessToken;
        await fetch(`${window.SUPABASE_URL}/rest/v1/sellers?user_id=eq.${currentSellerId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ cover_image: null })
        });
        if (currentSellerProfile) currentSellerProfile.cover_image = null;
        updateProfileUI();
        showToast('Cover image removed');
    } catch (e) { alert('Failed to remove cover image'); }
}

// ==================== LOCATION PICKER ====================
let locationMap, locationMarker, isMapInitialized = false;

window.initLocationPicker = function() {
    if (isMapInitialized) return;
    const mapDiv = document.getElementById('profile-map');
    if (!mapDiv) return;

    const savedLat = parseFloat(document.getElementById('seller_lat').value) || -17.8252;
    const savedLng = parseFloat(document.getElementById('seller_lng').value) || 31.0335;
    const center = { lat: savedLat, lng: savedLng };

    locationMap = new google.maps.Map(mapDiv, { center: center, zoom: 13, mapTypeControl: false });
    locationMarker = new google.maps.Marker({ position: center, map: locationMap, draggable: true });

    locationMarker.addListener('dragend', () => {
        const pos = locationMarker.getPosition();
        document.getElementById('seller_lat').value = pos.lat();
        document.getElementById('seller_lng').value = pos.lng();
        reverseGeocode(pos.lat(), pos.lng());
    });

    const input = document.getElementById('location-search');
    if (input) {
        const searchBox = new google.maps.places.SearchBox(input);
        locationMap.addListener('bounds_changed', () => searchBox.setBounds(locationMap.getBounds()));
        searchBox.addListener('places_changed', () => {
            const places = searchBox.getPlaces();
            if (places.length === 0) return;
            const place = places[0];
            if (!place.geometry) return;

            const loc = place.geometry.location;
            locationMarker.setPosition(loc);
            locationMap.panTo(loc);
            document.getElementById('seller_lat').value = loc.lat();
            document.getElementById('seller_lng').value = loc.lng();
            document.getElementById('seller_display_name').value = place.formatted_address || place.name;
            input.value = place.formatted_address || place.name;
        });
    }
    isMapInitialized = true;
};

// ... (Keeping standard reverseGeocode, toggleProfileForm, saveShopProfile helper implementations stable)
function reverseGeocode(lat, lng) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
            document.getElementById('seller_display_name').value = results[0].formatted_address;
            document.getElementById('location-search').value = results[0].formatted_address;
        }
    });
}

function loadLocationData() {
    const profile = currentSellerProfile;
    if (!profile) return;
    if (profile.latitude) {
        document.getElementById('seller_lat').value = profile.latitude;
        document.getElementById('seller_lng').value = profile.longitude;
        document.getElementById('seller_display_name').value = profile.location_display_name || '';
        document.getElementById('location-search').value = profile.location_display_name || '';
        if (isMapInitialized && locationMarker) {
            const pos = { lat: parseFloat(profile.latitude), lng: parseFloat(profile.longitude) };
            locationMarker.setPosition(pos);
            locationMap.panTo(pos);
        }
    }
}

window.toggleProfileForm = function() {
    const section = document.getElementById('profileSection');
    const btn = document.getElementById('toggleProfileBtn');
    if (section.style.display === 'none') {
        section.style.display = 'block';
        btn.textContent = 'Close Profile';
        setTimeout(() => {
            if (!isMapInitialized) window.initLocationPicker();
            loadLocationData();
        }, 300);
    } else {
        section.style.display = 'none';
        btn.textContent = 'Edit Profile';
    }
};

window.saveShopProfile = async function() {
    const description = document.getElementById('shopDescription').value.trim();
    const latitude = document.getElementById('seller_lat').value;
    const longitude = document.getElementById('seller_lng').value;
    const locationDisplay = document.getElementById('seller_display_name').value;
    try {
        const token = JSON.parse(localStorage.getItem('supabase_session'))?.access_token || currentAccessToken;
        await fetch(`${window.SUPABASE_URL}/rest/v1/sellers?user_id=eq.${currentSellerId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ shop_description: description, latitude: latitude || null, longitude: longitude || null, location_display_name: locationDisplay || null })
        });
        showToast('Shop profile saved successfully!');
    } catch (e) { alert('Failed to save profile'); }
};

// ==================== SUBSCRIPTION SCHEDULERS ====================
async function fetchSubscription(retries = 1) {
    try {
        const token = JSON.parse(localStorage.getItem('supabase_session'))?.access_token || currentAccessToken;
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
                        handleExpiredSubscription();
                        return null;
                    }
                }
                if (s.status === 'active' || s.status === 'paused') return s.plan_type;
            }
            return null;
        } else if (resp.status === 401 && retries > 0) {
            if (await refreshSession()) return fetchSubscription(0);
        }
        return null;
    } catch (e) { return null; }
}

async function updateSubscriptionStatus(sid, st) {
    try {
        const token = JSON.parse(localStorage.getItem('supabase_session'))?.access_token || currentAccessToken;
        await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions?id=eq.${sid}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status: st })
        });
    } catch (e) {}
}

function handleExpiredSubscription() {
    const max = 8;
    sellerProducts.forEach((p, i) => { p.paused = (i >= max); });
    currentTier = 'free';
    subscriptionStatus = 'expired';
    localStorage.setItem(`mbare_tier_${currentSellerId}`, 'free');
    renderTiers();
    renderProducts();
    updateStatsAndLimits();
    updateExpiryBanner();
    updateSubscriptionControls();
}

// ==================== PRODUCT UTILITIES ====================
async function loadProductsFromSupabase(retries = 1) {
    try {
        const token = JSON.parse(localStorage.getItem('supabase_session'))?.access_token || currentAccessToken;
        const r = await fetch(`${window.SUPABASE_URL}/rest/v1/products?seller_id=eq.${currentSellerId}&select=*&order=created_at.desc`, {
            headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
        });
        if (r.ok) {
            sellerProducts = await r.json();
            return true;
        } else if (r.status === 401 && retries > 0) {
            if (await refreshSession()) return loadProductsFromSupabase(0);
        }
        return false;
    } catch (e) { return false; }
}

function renderTiers() {
    const c = document.getElementById('tierContainer');
    if (!c) return;
    c.innerHTML = '';
    for (const [k, d] of Object.entries(tierMap)) {
        const isCurrent = currentTier === k;
        const isDowngrade = currentTier !== 'free' && k !== 'free' && d.level < tierMap[currentTier]?.level;
        const isDisabled = isCurrent || isDowngrade;
        let buttonText = isCurrent ? 'Current Plan' : (isDowngrade ? 'Locked' : 'Upgrade Plan');

        c.innerHTML += `<div class="tier-card ${isCurrent ? 'tier-highlight' : ''}">
            <strong>${d.name}</strong>
            <div class="tier-price">${d.price}</div>
            <div style="font-size:12px;">Max Allocation: ${d.maxProducts} active items</div>
            <button class="btn-primary subscribe-btn" data-tier="${k}" style="margin-top:10px; width:100%;" ${isDisabled ? 'disabled' : ''}>
                ${buttonText}
            </button>
        </div>`;
    }
    document.querySelectorAll('.subscribe-btn').forEach(b => {
        b.addEventListener('click', () => openPayNowPayment(b.dataset.tier));
    });
}

function enforceProductLimit() {
    const max = currentTier === 'free' ? 8 : (currentTier === 'tier_150' ? 50 : 200);
    sellerProducts.forEach((p, i) => p.paused = (i >= max));
    updateStatsAndLimits();
}

function updateStatsAndLimits() {
    const active = sellerProducts.filter(p => !p.paused).length;
    document.getElementById('totalProducts').innerText = active;
}

function renderProducts() {
    const c = document.getElementById('productsList');
    if (!c) return;
    c.innerHTML = sellerProducts.map(p => `
        <div class="product-card">
            <h3>${p.title}</h3>
            <p>$${p.price}</p>
        </div>
    `).join('');
}

function updateExpiryBanner() {
    const b = document.getElementById('expiryBanner');
    if (b) b.style.display = 'none';
}

function updateSubscriptionControls() {
    const c = document.getElementById('subscriptionControls');
    if (c) c.style.display = 'none';
}

function startExpiryChecker() {
    if (renewalCheckInterval) clearInterval(renewalCheckInterval);
    renewalCheckInterval = setInterval(async () => {
        if (currentTier === 'free' || !subscriptionExpiry) return;
        if (new Date(subscriptionExpiry) < new Date() && subscriptionStatus === 'active') handleExpiredSubscription();
    }, 60000);
}

// ==================== INITIALIZATION TRICGGER ====================
async function init() {
    if (!await checkAuth()) return;
    try {
        checkLocalStoragePaymentStatus();
        const sub = await fetchSubscription(1);
        currentTier = sub || 'free';
        localStorage.setItem(`mbare_tier_${currentSellerId}`, currentTier);
        await loadProductsFromSupabase(1);
        
        renderTiers();
        enforceProductLimit();
        renderProducts();
        startExpiryChecker();
        if(document.getElementById('loadingOverlay')) {
            document.getElementById('loadingOverlay').style.display = 'none';
        }
    } catch (e) {
        console.error('Init error:', e);
    }
}

document.addEventListener('DOMContentLoaded', init);
