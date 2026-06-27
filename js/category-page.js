(function () {
  var WEBSITE_URL = 'https://www.mbaremarketplace.com';

  function checkLogin() {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
      if (typeof showLoginPrompt === 'function') showLoginPrompt();
      return false;
    }
    return true;
  }

  function generateRatingStars(rating) {
    var fullStars = Math.floor(rating);
    var hasHalfStar = rating % 1 >= 0.5;
    var stars = '';
    for (var i = 0; i < fullStars; i += 1) stars += '\u2605';
    if (hasHalfStar) stars += '\u00bd';
    var emptyStars = 5 - Math.ceil(rating);
    for (var i = 0; i < emptyStars; i += 1) stars += '\u2606';
    return stars;
  }

  function matchesByKeywords(product, filter) {
    if (!filter) return true;
    var category = (product.category || '').toLowerCase();
    var title = (product.title || '').toLowerCase();
    var description = (product.description || '').toLowerCase();

    var inCategory = (filter.categoryKeywords || []).some(function(k) { return category.includes(k); });
    var inTitle = (filter.titleKeywords || []).some(function(k) { return title.includes(k); });
    var inDescription = (filter.descriptionKeywords || []).some(function(k) { return description.includes(k); });
    return inCategory || inTitle || inDescription;
  }

  window.initCategoryPage = function initCategoryPage(categoryKey) {
    var configMap = window.CATEGORY_PAGE_CONFIGS || {};
    var config = configMap[categoryKey];
    if (!config) {
      console.error('Missing category config for:', categoryKey);
      return;
    }

    var allProducts = [];
    var currentProducts = [];
    var sellersMap = {};
    var ratingsCache = {};

    function shuffleSlider() {
      var panels = document.querySelectorAll('.slide-panel img');
      panels.forEach(function(img) {
        img.style.opacity = '0.3';
        setTimeout(function() {
          img.src = config.images[Math.floor(Math.random() * config.images.length)];
          img.style.opacity = '1';
        }, 300);
      });
    }

    var sliderInterval = setInterval(shuffleSlider, 5000);

    async function loadSellers() {
      try {
        var response = await fetch(window.SUPABASE_URL + '/rest/v1/sellers?select=*', {
          headers: {
            apikey: window.SUPABASE_ANON_KEY,
            Authorization: 'Bearer ' + window.SUPABASE_ANON_KEY
          }
        });
        var sellers = await response.json();
        sellers.forEach(function(s) {
          sellersMap[s.user_id] = s;
        });
      } catch (e) {
        console.error('Error loading sellers:', e);
      }
    }

    async function getSellerRatings(sellerId) {
      if (ratingsCache[sellerId]) return ratingsCache[sellerId];
      try {
        var response = await fetch(window.SUPABASE_URL + '/rest/v1/ratings?seller_id=eq.' + sellerId + '&select=rating', {
          headers: {
            apikey: window.SUPABASE_ANON_KEY,
            Authorization: 'Bearer ' + window.SUPABASE_ANON_KEY
          }
        });
        var ratings = await response.json();
        var display = '<span style="color: #999;">No ratings yet</span>';
        if (ratings && ratings.length > 0) {
          var avg = ratings.reduce(function(acc, curr) { return acc + curr.rating; }, 0) / ratings.length;
          display = '<span style="color: #f90;">' + generateRatingStars(avg) + '</span> <span style="color: #666;">(' + ratings.length + ')</span>';
        }
        ratingsCache[sellerId] = { display: display };
        return ratingsCache[sellerId];
      } catch {
        return { display: '<span style="color: #999;">No ratings</span>' };
      }
    }

    async function loadProducts() {
      try {
        var response = await fetch(window.SUPABASE_URL + '/rest/v1/products?' + config.fetchQuery, {
          headers: {
            apikey: window.SUPABASE_ANON_KEY,
            Authorization: 'Bearer ' + window.SUPABASE_ANON_KEY
          }
        });
        var data = await response.json();

        var prepared = (data || []).map(function(p) {
          return {
            ...p,
            price: parseFloat(p.price),
            created_at: p.created_at || new Date().toISOString()
          };
        });

        allProducts = config.filter ? prepared.filter(function(p) { return matchesByKeywords(p, config.filter); }) : prepared;

        console.log(config.loadLabel + ' products found:', allProducts.length);
        currentProducts = allProducts.slice();
        await displayProducts(currentProducts);
        updateResultsCount(currentProducts.length);
      } catch (error) {
        console.error('Error loading products:', error);
        var container = document.getElementById(config.gridId);
        if (container) {
          container.innerHTML = '<p style="text-align:center; padding:40px;">Error loading products. Please refresh the page.</p>';
        }
      }
    }

    // Calculate distance for products
    function addDistancesToProducts(products) {
      var userLoc = window.getUserLocationFromSession ? window.getUserLocationFromSession() : null;
      
      return products.map(function(p) {
        var seller = sellersMap[p.seller_id] || {};
        var sellerLat = parseFloat(seller.latitude);
        var sellerLng = parseFloat(seller.longitude);
        var distance = null;
        var distanceDisplay = 'Location unknown';
        
        if (userLoc && sellerLat && sellerLng) {
          distance = window.calculateDistance ? window.calculateDistance(userLoc.lat, userLoc.lng, sellerLat, sellerLng) : null;
          distanceDisplay = window.formatDistance ? window.formatDistance(distance) : (distance !== null ? distance.toFixed(1) + 'km away' : 'Location unknown');
        }
        
        return {
          ...p,
          distance: distance,
          distanceDisplay: distanceDisplay,
          sellerLat: sellerLat,
          sellerLng: sellerLng,
          sellerLocation: seller.location_display_name || seller.business_address || 'Location not set'
        };
      });
    }

    async function displayProducts(products) {
      var container = document.getElementById(config.gridId);
      if (!container) return;

      if (!products || products.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:40px;">' + config.emptyMessage + '</p>';
        return;
      }

      // Add distances to products
      var productsWithDistance = addDistancesToProducts(products);
      
      // Sort by distance if user has location
      var userLoc = window.getUserLocationFromSession ? window.getUserLocationFromSession() : null;
      if (userLoc) {
        productsWithDistance.sort(function(a, b) {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
      }

      container.innerHTML = '';

      for (var i = 0; i < productsWithDistance.length; i++) {
        var p = productsWithDistance[i];
        var seller = sellersMap[p.seller_id] || {};
        var ratingInfo = await getSellerRatings(p.seller_id);
        var card = document.createElement('div');
        card.className = 'product-card';
        card.style.position = 'relative';
        
        // Distance badge HTML
        var distanceBadge = '';
        if (p.distance !== null && userLoc) {
          var badgeClass = 'distance-badge';
          if (p.distance > 20) badgeClass += ' very-far';
          else if (p.distance > 10) badgeClass += ' far';
          distanceBadge = '<span class="' + badgeClass + '" style="position:absolute;top:10px;right:10px;background:#28a745;color:white;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;z-index:5;">' + p.distanceDisplay + '</span>';
        }
        
        var imageUrl = p.image_url || 'https://via.placeholder.com/300x300?text=' + config.placeholderText;
        var title = p.title || 'Product';
        var price = (p.price || 0).toFixed(2);
        // Use CSS triangle shape for location indicator
        var sellerLocationDisplay = '<span class="location-shape"></span> ' + p.sellerLocation;
        var sellerName = seller.business_name || config.sellerFallback;
        
        card.innerHTML = 
          distanceBadge +
          '<img src="' + imageUrl + '" class="product-image" onclick="viewProduct(\'' + p.id + '\')" style="cursor: pointer;" onerror="this.src=\'https://via.placeholder.com/300x300?text=' + config.placeholderText + '\'">' +
          '<h3 class="product-title" onclick="viewProduct(\'' + p.id + '\')" style="cursor: pointer;">' + title + '</h3>' +
          '<div class="product-price">$' + price + '</div>' +
          '<div style="font-size:12px;color:#666;margin:4px 0;">' + sellerLocationDisplay + '</div>' +
          '<a href="shop.html?seller=' + p.seller_id + '" class="visit-shop-link" onclick="event.stopPropagation()" style="color:#f90;text-decoration:underline;font-size:12px;display:inline-block;margin:5px 0;">Visit Shop</a>' +
          '<div class="product-seller">' + sellerName + '</div>' +
          '<div class="seller-rating">' + ratingInfo.display + '</div>' +
          '<div class="product-actions">' +
            '<button class="btn-add-cart" onclick="addToBasket(\'' + p.id + '\')">Add to Basket</button>' +
            '<button onclick="showSellerContact(\'' + p.id + '\')" style="background:#25D366;color:white;border:none;padding:8px;border-radius:4px;width:100%;margin-top:5px;cursor:pointer">Contact Seller</button>' +
          '</div>';
        container.appendChild(card);
      }
    }

    window.showSellerContact = function showSellerContact(productId) {
      if (!checkLogin()) return;
      var product = allProducts.find(function(p) { return p.id == productId; });
      if (!product) return;
      var seller = sellersMap[product.seller_id];
      if (!seller) return;

      var phone = seller.business_phone || 'Not provided';
      var phoneDigits = phone.replace(/\D/g, '');
      var whatsappMessage = 'Hello! I am interested in ' + product.title + ', I saw it on ' + WEBSITE_URL;
      var encodedMessage = encodeURIComponent(whatsappMessage);
      var whatsappLink = phoneDigits ? 'https://wa.me/' + phoneDigits + '?text=' + encodedMessage : '#';
      var callLink = phoneDigits ? 'tel:' + phoneDigits : '#';

      var modal = document.getElementById('sellerContactModal');
      var modalContent = document.getElementById('sellerContactContent');

      modalContent.innerHTML = 
        '<div class="product-title">' + product.title + '</div>' +
        '<div class="seller-info">' +
          '<div class="info-row"><div class="info-icon"></div><div class="info-text"><div class="info-label">Seller</div><div class="info-value">' + (seller.business_name || 'Unknown Seller') + '</div></div></div>' +
          '<div class="info-row"><div class="info-icon"></div><div class="info-text"><div class="info-label">Phone Number</div><div class="info-value">' + phone + '</div></div></div>' +
          '<div class="info-row"><div class="info-icon"></div><div class="info-text"><div class="info-label">Shop Location</div><div class="info-value">' + (seller.business_address || seller.location_display_name || 'Location not specified') + '</div></div></div>' +
          '<div class="info-row"><div class="info-icon"></div><div class="info-text"><div class="info-label">Price</div><div class="info-value">$' + (product.price || 0).toFixed(2) + '</div></div></div>' +
        '</div>' +
        '<div class="contact-actions">' +
          '<a href="' + callLink + '" class="contact-btn call-btn">Call Seller</a>' +
          '<a href="' + whatsappLink + '" class="contact-btn whatsapp-btn" target="_blank">WhatsApp</a>' +
        '</div>';

      modal.style.display = 'block';
      window.onclick = function closeOnOutsideClick(event) {
        if (event.target === modal) modal.style.display = 'none';
      };
    };

    window.handleSearch = function handleSearch() {
      var input = document.getElementById('searchInput');
      var searchTerm = (input?.value || '').toLowerCase();
      if (!searchTerm) {
        currentProducts = allProducts.slice();
      } else {
        currentProducts = allProducts.filter(function(product) {
          return (product.title && product.title.toLowerCase().includes(searchTerm)) ||
                 (product.description && product.description.toLowerCase().includes(searchTerm));
        });
      }
      displayProducts(currentProducts);
      updateResultsCount(currentProducts.length);
    };

    function updateResultsCount(count) {
      var countElement = document.getElementById('resultsCount');
      if (countElement) {
        var userLoc = window.getUserLocationFromSession ? window.getUserLocationFromSession() : null;
        var locationText = userLoc ? ' (sorted by distance)' : '';
        countElement.textContent = count + ' product' + (count !== 1 ? 's' : '') + ' found' + locationText;
      }
    }

    window.sortProducts = function sortProducts() {
      var sortValue = document.getElementById('sortSelect')?.value;
      if (sortValue === 'price_low') {
        currentProducts.sort(function(a, b) { return (a.price || 0) - (b.price || 0); });
      } else if (sortValue === 'price_high') {
        currentProducts.sort(function(a, b) { return (b.price || 0) - (a.price || 0); });
      } else {
        currentProducts.sort(function(a, b) { return new Date(b.created_at || 0) - new Date(a.created_at || 0); });
      }
      displayProducts(currentProducts);
    };

    window.viewProduct = function viewProduct(productId) {
      if (!checkLogin()) return;
      window.location.href = 'product-detail.html?id=' + productId;
    };

    window.addToBasket = function addToBasket(productId) {
      var sessionData = localStorage.getItem('supabase_session');
      if (!sessionData) {
        window.location.href = 'login.html';
        return;
      }
      var session = JSON.parse(sessionData);
      var basketKey = 'basket_' + session.user.id;
      var basket = JSON.parse(localStorage.getItem(basketKey)) || [];
      var product = allProducts.find(function(p) { return p.id == productId; });
      if (!product) return;

      var existingItem = basket.find(function(item) { return item.id == productId; });
      if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
      } else {
        basket.push({ ...product, quantity: 1 });
      }

      localStorage.setItem(basketKey, JSON.stringify(basket));
      updateBasketCount(basket.reduce(function(sum, item) { return sum + (item.quantity || 1); }, 0));
      alert('Item added to basket!');
    };

    function updateBasketCount(count) {
      var el = document.getElementById('basketCount');
      if (el) {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
      }
    }

    window.logout = function logout() {
      localStorage.removeItem('supabase_session');
      localStorage.removeItem('isLoggedIn');
      window.location.href = 'index.html';
    };

    function wireSearchEnterKey() {
      var searchInput = document.getElementById('searchInput');
      if (!searchInput) return;
      searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') window.handleSearch();
      });
    }

    // Refresh products (for location changes)
    window.refreshProducts = function() {
      displayProducts(currentProducts);
    };

    async function start() {
      wireSearchEnterKey();
      await loadSellers();
      await loadProducts();
      
      // Initialize location
      if (typeof window.initLocation === 'function') {
        window.initLocation();
      }
      
      var sessionData = localStorage.getItem('supabase_session');
      if (sessionData) {
        var session = JSON.parse(sessionData);
        var basket = JSON.parse(localStorage.getItem('basket_' + session.user.id)) || [];
        updateBasketCount(basket.reduce(function(sum, item) { return sum + (item.quantity || 1); }, 0));
        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        var accountLabel = document.querySelector('.account-label');
        if (accountLabel) accountLabel.textContent = 'Hello, ' + session.user.email.split('@')[0];
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }

    window.addEventListener('beforeunload', function() {
      if (sliderInterval) clearInterval(sliderInterval);
      sliderInterval = null;
    });
  };

  function autoInitFromBodyDataAttribute() {
    var key = document.body?.dataset?.category;
    if (!key) return;
    if (typeof window.initCategoryPage === 'function') {
      window.initCategoryPage(key);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitFromBodyDataAttribute);
  } else {
    autoInitFromBodyDataAttribute();
  }
})();
