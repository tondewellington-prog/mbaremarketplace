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
  let currentUserLat = null;
  let currentUserLng = null;

  // Get user's location via browser - SILENT, no UI prompts
  function getUserLocation() {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            currentUserLat = position.coords.latitude;
            currentUserLng = position.coords.longitude;
            sessionStorage.setItem('userLat', currentUserLat);
            sessionStorage.setItem('userLng', currentUserLng);
            resolve({ lat: currentUserLat, lng: currentUserLng });
          },
          (error) => {
            console.log('Location permission denied or error:', error.message);
            // Try to get from session storage if previously allowed
            const savedLat = sessionStorage.getItem('userLat');
            const savedLng = sessionStorage.getItem('userLng');
            if (savedLat && savedLng) {
              currentUserLat = parseFloat(savedLat);
              currentUserLng = parseFloat(savedLng);
              resolve({ lat: currentUserLat, lng: currentUserLng });
            } else {
              resolve(null);
            }
          }
        );
      } else {
        const savedLat = sessionStorage.getItem('userLat');
        const savedLng = sessionStorage.getItem('userLng');
        if (savedLat && savedLng) {
          currentUserLat = parseFloat(savedLat);
          currentUserLng = parseFloat(savedLng);
          resolve({ lat: currentUserLat, lng: currentUserLng });
        } else {
          resolve(null);
        }
      }
    });
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

  // Format distance for display on product cards
  function formatDistance(km) {
    if (km === null || km === undefined) return null;
    if (km < 1) {
      return Math.round(km * 1000) + 'm';
    }
    return km.toFixed(1) + 'km';
  }

  // Get user location from session
  function getUserLocationFromSession() {
    const savedLat = sessionStorage.getItem('userLat');
    const savedLng = sessionStorage.getItem('userLng');
    if (savedLat && savedLng) {
      currentUserLat = parseFloat(savedLat);
      currentUserLng = parseFloat(savedLng);
      return { lat: currentUserLat, lng: currentUserLng };
    }
    return null;
  }

  // Check if user has location set
  function hasUserLocation() {
    return currentUserLat !== null && currentUserLng !== null;
  }

  // Get distance badge class based on distance
  function getDistanceBadgeClass(distance) {
    if (distance === null || distance === undefined) return '';
    if (distance > 20) return 'distance-badge very-far';
    if (distance > 10) return 'distance-badge far';
    return 'distance-badge';
  }

  // Initialize location - SILENT, just tries to get location
  function initLocation() {
    // Check if we already have location in session
    const saved = getUserLocationFromSession();
    if (saved) {
      currentUserLat = saved.lat;
      currentUserLng = saved.lng;
      return;
    }
    
    // Silently try to get location - browser will show native permission prompt
    getUserLocation();
  }

  // ==================== EXPOSE FUNCTIONS GLOBALLY ====================
  window.getUserLocation = getUserLocation;
  window.calculateDistance = calculateDistance;
  window.formatDistance = formatDistance;
  window.getUserLocationFromSession = getUserLocationFromSession;
  window.hasUserLocation = hasUserLocation;
  window.getDistanceBadgeClass = getDistanceBadgeClass;
  window.initLocation = initLocation;

  // ==================== UI COMMON EXPORTS ====================
  window.uiCommon = {
    getSession,
    getCurrentUser,
    updateHeaderForLoggedInUser,
    updateBasketCount,
    handleSearchRedirect,
    logoutToHome,
    getUserLocation,
    calculateDistance,
    formatDistance,
    getUserLocationFromSession,
    hasUserLocation,
    getDistanceBadgeClass,
    initLocation
  };
})();

// Auto-init location on page load - SILENT
document.addEventListener('DOMContentLoaded', function() {
  if (typeof window.initLocation === 'function') {
    window.initLocation();
  }
});
