(function () {
  function getSession() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const raw = localStorage.getItem('supabase_session');
    if (!isLoggedIn || !raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_e) {
      return null;
    }
  }

  function getCurrentUser() {
    const session = getSession();
    return session?.user || null;
  }

  function updateHeaderForLoggedInUser(options = {}) {
    const {
      accountLabelId = 'accountLabel',
      accountLinkId = 'accountLink',
      accountLabelSelector = '.account-label',
      accountLinkSelector = '.account-link',
      logoutBtnId = 'logoutBtn'
    } = options;

    const session = getSession();
    if (!session) return;

    const email = session.user?.email || 'User';
    const userName = email.split('@')[0];
    const accountLabel =
      document.getElementById(accountLabelId) || document.querySelector(accountLabelSelector);
    const accountLink =
      document.getElementById(accountLinkId) || document.querySelector(accountLinkSelector);
    const logoutBtn = document.getElementById(logoutBtnId);

    if (accountLabel) accountLabel.textContent = `Hello, ${userName}`;
    if (accountLink) accountLink.textContent = 'Your Account';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
  }

  function updateBasketCount(basketElementId = 'basketCount') {
    const basketCount = document.getElementById(basketElementId);
    const user = getCurrentUser();
    if (!basketCount || !user?.id) return;

    const basketKey = `basket_${user.id}`;
    const userBasket = JSON.parse(localStorage.getItem(basketKey) || '[]');
    const total = userBasket.reduce((sum, item) => sum + (item.quantity || 0), 0);
    basketCount.textContent = total;
    basketCount.style.display = total > 0 ? 'flex' : 'none';
  }

  function handleSearchRedirect(options = {}) {
    const { defaultCategory = 'all', includeCategory = true } = options;
    const query = (document.getElementById('searchInput')?.value || '').trim();
    const category = document.getElementById('searchCategory')?.value || defaultCategory;

    if (!query) {
      window.location.href = 'search-results.html';
      return;
    }

    const categoryPart = includeCategory
      ? `&category=${encodeURIComponent(category)}`
      : '';
    window.location.href = `search-results.html?q=${encodeURIComponent(query)}${categoryPart}`;
  }

  function logoutToHome(useApiIfAvailable = true) {
    if (useApiIfAvailable && window.api && window.api.logout) {
      window.api.logout();
      return;
    }
    localStorage.removeItem('supabase_session');
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'index.html';
  }

  // ==================== LOCATION & DISTANCE FUNCTIONS ====================
  let userLat = null;
  let userLng = null;

  // Get user's location via browser
  function getUserLocation() {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            userLat = position.coords.latitude;
            userLng = position.coords.longitude;
            sessionStorage.setItem('userLat', userLat);
            sessionStorage.setItem('userLng', userLng);
            document.getElementById('distanceInfo')?.innerHTML = '📍 Showing products near you';
            resolve({ lat: userLat, lng: userLng });
          },
          (error) => {
            console.error('Location error:', error);
            // Try to get from session storage
            const savedLat = sessionStorage.getItem('userLat');
            const savedLng = sessionStorage.getItem('userLng');
            if (savedLat && savedLng) {
              userLat = parseFloat(savedLat);
              userLng = parseFloat(savedLng);
              resolve({ lat: userLat, lng: userLng });
            } else {
              resolve(null);
            }
          }
        );
      } else {
        const savedLat = sessionStorage.getItem('userLat');
        const savedLng = sessionStorage.getItem('userLng');
        if (savedLat && savedLng) {
          userLat = parseFloat(savedLat);
          userLng = parseFloat(savedLng);
          resolve({ lat: userLat, lng: userLng });
        } else {
          resolve(null);
        }
      }
    });
  }

  // Search manual location
  async function searchManualLocation() {
    const input = document.getElementById('manualLocation');
    if (!input) return;
    const query = input.value.trim();
    if (query.length < 3) {
      alert('Please enter a valid location');
      return;
    }
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=zw`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        userLat = parseFloat(data[0].lat);
        userLng = parseFloat(data[0].lon);
        sessionStorage.setItem('userLat', userLat);
        sessionStorage.setItem('userLng', userLng);
        document.getElementById('distanceInfo').innerHTML = `📍 Showing products near: ${data[0].display_name}`;
        // Trigger refresh if function exists
        if (typeof window.refreshProducts === 'function') {
          window.refreshProducts();
        }
        return { lat: userLat, lng: userLng };
      } else {
        alert('Location not found. Please try again.');
        return null;
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Error searching location. Please try again.');
      return null;
    }
  }

  // Calculate distance using Haversine formula (returns km)
  function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Format distance for display
  function formatDistance(km) {
    if (km === null || km === undefined) return 'Location unknown';
    if (km < 1) {
      return Math.round(km * 1000) + 'm away';
    }
    return km.toFixed(1) + 'km away';
  }

  // Get user location from session
  function getUserLocationFromSession() {
    const savedLat = sessionStorage.getItem('userLat');
    const savedLng = sessionStorage.getItem('userLng');
    if (savedLat && savedLng) {
      userLat = parseFloat(savedLat);
      userLng = parseFloat(savedLng);
      return { lat: userLat, lng: userLng };
    }
    return null;
  }

  // Check if user has location set
  function hasUserLocation() {
    return userLat !== null && userLng !== null;
  }

  // Get distance badge class based on distance
  function getDistanceBadgeClass(distance) {
    if (distance === null || distance === undefined) return '';
    if (distance > 20) return 'distance-badge very-far';
    if (distance > 10) return 'distance-badge far';
    return 'distance-badge';
  }

  // Inject location prompt into page
  function injectLocationPrompt() {
    // Check if prompt already exists
    if (document.getElementById('locationPrompt')) return;
    
    const promptHTML = `
      <div id="locationPrompt" style="background:#f0f8ff; padding:15px; border-radius:10px; margin-bottom:20px; display:flex; align-items:center; gap:15px; flex-wrap:wrap;">
        <span style="font-weight:600;">📍 Find nearby products:</span>
        <button onclick="getUserLocation()" class="btn-primary" style="padding:8px 20px; background:#f90; border:none; border-radius:6px; color:white; font-weight:600; cursor:pointer;">Use My Location</button>
        <span style="color:#666;font-size:14px;">or</span>
        <input type="text" id="manualLocation" placeholder="Enter city or address..." style="padding:8px 15px; border-radius:6px; border:1px solid #ccc; flex:1; min-width:150px;">
        <button onclick="searchManualLocation()" class="btn-secondary" style="padding:8px 20px; background:#e7e9ec; border:none; border-radius:6px; font-weight:500; cursor:pointer;">Search</button>
      </div>
      <div id="distanceInfo" style="text-align:center;padding:10px;color:#666;font-size:14px;"></div>
    `;
    
    // Insert after the filter bar or at the top of the main content
    const filterBar = document.querySelector('.filter-bar');
    if (filterBar) {
      filterBar.insertAdjacentHTML('afterend', promptHTML);
    } else {
      const mainContent = document.querySelector('.main-content .container');
      if (mainContent) {
        mainContent.insertAdjacentHTML('afterbegin', promptHTML);
      }
    }
  }

  // Initialize location on page load
  function initLocation() {
    const saved = getUserLocationFromSession();
    if (saved) {
      userLat = saved.lat;
      userLng = saved.lng;
      const info = document.getElementById('distanceInfo');
      if (info) info.innerHTML = '📍 Showing products near you';
    }
    
    // Inject location prompt if not on dashboard
    if (!window.location.pathname.includes('seller-dashboard')) {
      injectLocationPrompt();
    }
  }

  // Expose location functions globally
  window.userLat = userLat;
  window.userLng = userLng;
  window.getUserLocation = getUserLocation;
  window.searchManualLocation = searchManualLocation;
  window.calculateDistance = calculateDistance;
  window.formatDistance = formatDistance;
  window.getUserLocationFromSession = getUserLocationFromSession;
  window.hasUserLocation = hasUserLocation;
  window.getDistanceBadgeClass = getDistanceBadgeClass;
  window.initLocation = initLocation;
  window.injectLocationPrompt = injectLocationPrompt;

  // ==================== END LOCATION FUNCTIONS ====================

  window.uiCommon = {
    getSession,
    getCurrentUser,
    updateHeaderForLoggedInUser,
    updateBasketCount,
    handleSearchRedirect,
    logoutToHome,
    getUserLocation,
    searchManualLocation,
    calculateDistance,
    formatDistance,
    getUserLocationFromSession,
    hasUserLocation,
    getDistanceBadgeClass,
    initLocation,
    injectLocationPrompt
  };
})();

// Auto-init location on page load
document.addEventListener('DOMContentLoaded', function() {
  if (typeof window.initLocation === 'function') {
    window.initLocation();
  }
});
