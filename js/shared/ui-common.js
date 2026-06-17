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

  window.uiCommon = {
    getSession,
    getCurrentUser,
    updateHeaderForLoggedInUser,
    updateBasketCount,
    handleSearchRedirect,
    logoutToHome
  };
})();
