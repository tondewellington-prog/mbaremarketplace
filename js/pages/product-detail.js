// ============================================
// PRODUCT DETAIL PAGE - JavaScript
// ============================================

var SUPABASE_URL = window.SUPABASE_URL || 'https://fnncerdxfhwlrdopswpx.supabase.co';
var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_qjN17tdmLu5yvp9iIUBEjg_ZDZCWMhK';

// WhatsApp share endpoint (same one used by the Share button)
var SHARE_ENDPOINT = 'https://fnncerdxfhwlrdopswpx.supabase.co/functions/v1/product-share';

// ============================================
// GALLERY STATE
// ============================================

var galleryImages = [];      // array of image URLs for the current product
var currentImageIndex = 0;   // which image is currently shown
var lightboxOpen = false;    // is the full-page lightbox visible

// ============================================
// GET URL PARAMETERS
// ============================================

function getUrlParams() {
    var params = new URLSearchParams(window.location.search);
    return {
        productId: params.get('id')
    };
}

// ============================================
// FETCH PRODUCT DATA
// ============================================

async function fetchProductData(productId) {
    try {
        var response = await fetch(
            SUPABASE_URL + '/rest/v1/products?id=eq.' + productId + '&select=*',
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch product');
        }

        var products = await response.json();
        if (!products || products.length === 0) {
            throw new Error('Product not found');
        }

        var product = products[0];

        var sellerResponse = await fetch(
            SUPABASE_URL + '/rest/v1/sellers?user_id=eq.' + product.seller_id + '&select=*',
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
                }
            }
        );

        var seller = null;
        if (sellerResponse.ok) {
            var sellers = await sellerResponse.json();
            if (sellers && sellers.length > 0) {
                seller = sellers[0];
            }
        }

        var ratingsResponse = await fetch(
            SUPABASE_URL + '/rest/v1/ratings?product_id=eq.' + productId + '&select=rating',
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
                }
            }
        );

        var avgRating = 0;
        var ratingCount = 0;
        if (ratingsResponse.ok) {
            var ratings = await ratingsResponse.json();
            if (ratings && ratings.length > 0) {
                var sum = ratings.reduce(function(acc, r) { return acc + r.rating; }, 0);
                avgRating = sum / ratings.length;
                ratingCount = ratings.length;
            }
        }

        var sellerRatingsResponse = await fetch(
            SUPABASE_URL + '/rest/v1/ratings?seller_id=eq.' + product.seller_id + '&select=rating',
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
                }
            }
        );

        var sellerAvgRating = 0;
        var sellerRatingCount = 0;
        if (sellerRatingsResponse.ok) {
            var sellerRatings = await sellerRatingsResponse.json();
            if (sellerRatings && sellerRatings.length > 0) {
                var sellerSum = sellerRatings.reduce(function(acc, r) { return acc + r.rating; }, 0);
                sellerAvgRating = sellerSum / sellerRatings.length;
                sellerRatingCount = sellerRatings.length;
            }
        }

        return {
            product: product,
            seller: seller,
            rating: avgRating,
            ratingCount: ratingCount,
            sellerRating: sellerAvgRating,
            sellerRatingCount: sellerRatingCount
        };

    } catch (error) {
        console.error('Error fetching product:', error);
        throw error;
    }
}

// ============================================
// BUILD GALLERY IMAGE ARRAY
// ============================================
// Falls back to [image_url] for old products with only a single image.
// Uses whatever is in `product.images` if present.
// ============================================

function buildGalleryImages(product) {
    var list = [];

    // Prefer the images array if it exists and has content
    if (Array.isArray(product.images) && product.images.length > 0) {
        product.images.forEach(function(url) {
            if (url && typeof url === 'string' && url.trim() !== '') {
                list.push(url);
            }
        });
    }

    // If empty, fall back to the single image_url
    if (list.length === 0 && product.image_url) {
        list.push(product.image_url);
    }

    // If still empty, use a placeholder
    if (list.length === 0) {
        list.push('https://via.placeholder.com/600x400?text=Product');
    }

    return list;
}

// ============================================
// RENDER PRODUCT DETAIL
// ============================================

function renderProductDetail(data) {
    var container = document.getElementById('productDetailContent');
    if (!container) return;

    var product = data.product;
    var seller = data.seller;
    var rating = data.rating || 0;
    var ratingCount = data.ratingCount || 0;
    var sellerRating = data.sellerRating || 0;
    var sellerRatingCount = data.sellerRatingCount || 0;

    var stock = product.stock !== null && product.stock !== undefined ? parseInt(product.stock) : 0;
    var stockText = stock > 0 ? 'In Stock' : 'Out of Stock';
    var stockClass = stock > 0 ? 'in-stock' : 'out-of-stock';

    // Build gallery image list and set the first one as active
    galleryImages = buildGalleryImages(product);
    currentImageIndex = 0;
    var mainImageUrl = galleryImages[0];

    var starsHtml = generateStars(rating);
    var sellerStarsHtml = generateStars(sellerRating);

    var sellerName = seller ? (seller.business_name || 'Unknown Seller') : 'Unknown Seller';
    var sellerLocation = seller ? (seller.location_display_name || seller.business_address || 'Location not specified') : 'Location not specified';
    var sellerPhone = seller ? seller.business_phone : null;

    // Build the WhatsApp message for the Contact Seller button.
    var contactMessage = 'Hello, I am interested in this product on Mbare Marketplace.\n\n'
        + '*' + (product.title || 'Product') + '*\n'
        + 'Price: $' + Number(product.price || 0).toFixed(2) + '\n\n'
        + SHARE_ENDPOINT + '?id=' + encodeURIComponent(product.id);

    var contactHref = sellerPhone
        ? 'https://wa.me/' + sellerPhone.replace(/\D/g, '') + '?text=' + encodeURIComponent(contactMessage)
        : null;

    // Build thumbnail strip HTML (only if more than one image)
    var thumbnailStripHtml = '';
    if (galleryImages.length > 1) {
        thumbnailStripHtml = '<div class="product-thumbnails" id="thumbnailsContainer">'
            + galleryImages.map(function(img, i) {
                var active = i === 0 ? ' active' : '';
                return '<img src="' + img + '" '
                    + 'alt="' + escapeHtml(product.title) + ' image ' + (i + 1) + '" '
                    + 'class="product-thumbnail' + active + '" '
                    + 'data-index="' + i + '" '
                    + 'onclick="changeMainImage(' + i + ')" '
                    + 'onerror="this.style.opacity=\'0.3\'">';
            }).join('')
            + '</div>';
    }

    var html = `
        <div class="product-detail-wrapper">
            <div class="product-detail-container">
                <!-- Left Column - Image Gallery -->
                <div class="product-image-gallery">
                    <img src="${mainImageUrl}"
                         alt="${escapeHtml(product.title)}"
                         class="product-main-image"
                         id="mainImage"
                         onclick="openImageLightbox()"
                         onerror="this.src='https://via.placeholder.com/600x400?text=Product'">
                    ${thumbnailStripHtml}
                </div>

                <!-- Right Column - Info -->
                <div class="product-detail-info">
                    <h1 class="product-detail-title">${escapeHtml(product.title)}</h1>
                    <div class="product-detail-price">$${parseFloat(product.price).toFixed(2)}</div>
                    
                    <div class="product-detail-rating">
                        <span class="stars">${starsHtml}</span>
                        <span class="rating-count">${ratingCount > 0 ? '(' + ratingCount + ' ratings)' : 'No ratings yet'}</span>
                    </div>

                    <div class="product-detail-stock ${stockClass}">${stockText}</div>

                    <div class="product-detail-seller">
                        Seller: <a href="shop.html?seller=${product.seller_id}">${escapeHtml(sellerName)}</a>
                    </div>

                    <div class="product-detail-category">
                        Category: <span>${escapeHtml(product.category || 'Uncategorized')}</span>
                    </div>

                    <div class="product-detail-description">
                        ${escapeHtml(product.description || 'No description available.')}
                    </div>

                    <div class="product-detail-actions">
                        <button class="btn-primary" onclick="addToBasket('${product.id}')">Add to Basket</button>
                        ${contactHref
                            ? '<a href="' + contactHref + '" target="_blank" rel="noopener" class="btn-whatsapp">Contact Seller</a>'
                            : '<button class="btn-secondary" onclick="showContactModal()">Contact Seller</button>'}
                    </div>

                    <!-- Seller Info Card -->
                    <div class="seller-info-card">
                        <h3>About the Seller</h3>
                        <div class="seller-name">${escapeHtml(sellerName)}</div>
                        <a href="shop.html?seller=${product.seller_id}" class="visit-shop-link" style="color:#f90;text-decoration:underline;font-size:13px;display:inline-block;margin:4px 0 8px 0;">Visit Shop</a>
                        <div class="seller-location">&#128205; ${escapeHtml(sellerLocation)}</div>
                        ${sellerPhone ? '<div class="seller-location">&#128222; ' + escapeHtml(sellerPhone) + '</div>' : ''}
                        <div class="seller-rating">
                            ${sellerRating > 0 ? '<span class="stars">' + sellerStarsHtml + '</span> ' + sellerRating.toFixed(1) + ' (' + sellerRatingCount + ' ratings)' : 'No seller ratings yet'}
                        </div>
                        <button class="btn-rate-seller" onclick="openRatingModal('${product.seller_id}', '${escapeHtml(sellerName)}')">
                            Rate Seller
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// ============================================
// GALLERY CONTROLS
// ============================================

function changeMainImage(index) {
    if (index < 0 || index >= galleryImages.length) return;
    currentImageIndex = index;

    var mainImage = document.getElementById('mainImage');
    if (mainImage) mainImage.src = galleryImages[index];

    var thumbs = document.querySelectorAll('.product-thumbnail');
    thumbs.forEach(function(t, i) {
        if (i === index) t.classList.add('active');
        else t.classList.remove('active');
    });

    // If lightbox is open, keep it in sync
    if (lightboxOpen) {
        var lightboxImg = document.getElementById('lightboxImage');
        if (lightboxImg) lightboxImg.src = galleryImages[index];
        updateLightboxCounter();
    }
}

// ============================================
// LIGHTBOX
// ============================================

function openImageLightbox() {
    if (!galleryImages.length) return;

    var existing = document.getElementById('imageLightbox');
    if (existing) existing.remove();

    var lightbox = document.createElement('div');
    lightbox.id = 'imageLightbox';
    lightbox.className = 'image-lightbox-overlay';
    lightbox.innerHTML = `
        <button class="lightbox-close" onclick="closeImageLightbox()" aria-label="Close">&times;</button>
        ${galleryImages.length > 1 ? '<button class="lightbox-nav lightbox-prev" onclick="lightboxPrev(event)" aria-label="Previous">&#10094;</button>' : ''}
        <img src="${galleryImages[currentImageIndex]}" alt="Full-size product image" class="lightbox-image" id="lightboxImage">
        ${galleryImages.length > 1 ? '<button class="lightbox-nav lightbox-next" onclick="lightboxNext(event)" aria-label="Next">&#10095;</button>' : ''}
        ${galleryImages.length > 1 ? '<div class="lightbox-counter" id="lightboxCounter">' + (currentImageIndex + 1) + ' / ' + galleryImages.length + '</div>' : ''}
    `;

    document.body.appendChild(lightbox);
    lightboxOpen = true;

    // Close on backdrop click
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) closeImageLightbox();
    });
}

function closeImageLightbox() {
    var lightbox = document.getElementById('imageLightbox');
    if (lightbox) lightbox.remove();
    lightboxOpen = false;
}

function lightboxNext(event) {
    if (event) event.stopPropagation();
    if (!galleryImages.length) return;
    currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
    var img = document.getElementById('lightboxImage');
    if (img) img.src = galleryImages[currentImageIndex];
    var main = document.getElementById('mainImage');
    if (main) main.src = galleryImages[currentImageIndex];
    // Keep the thumbnail strip in sync
    var thumbs = document.querySelectorAll('.product-thumbnail');
    thumbs.forEach(function(t, i) {
        if (i === currentImageIndex) t.classList.add('active');
        else t.classList.remove('active');
    });
    updateLightboxCounter();
}

function lightboxPrev(event) {
    if (event) event.stopPropagation();
    if (!galleryImages.length) return;
    currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
    var img = document.getElementById('lightboxImage');
    if (img) img.src = galleryImages[currentImageIndex];
    var main = document.getElementById('mainImage');
    if (main) main.src = galleryImages[currentImageIndex];
    var thumbs = document.querySelectorAll('.product-thumbnail');
    thumbs.forEach(function(t, i) {
        if (i === currentImageIndex) t.classList.add('active');
        else t.classList.remove('active');
    });
    updateLightboxCounter();
}

function updateLightboxCounter() {
    var counter = document.getElementById('lightboxCounter');
    if (counter) counter.textContent = (currentImageIndex + 1) + ' / ' + galleryImages.length;
}

// Global key handling
document.addEventListener('keydown', function(e) {
    if (!lightboxOpen) return;
    if (e.key === 'Escape') closeImageLightbox();
    else if (e.key === 'ArrowRight') lightboxNext();
    else if (e.key === 'ArrowLeft') lightboxPrev();
});

// ============================================
// GENERATE STARS
// ============================================

function generateStars(rating) {
    var stars = '';
    var fullStars = Math.floor(rating);
    var hasHalfStar = rating % 1 >= 0.5;
    for (var i = 0; i < fullStars; i++) stars += '&#9733;';
    if (hasHalfStar) stars += '&#189;';
    var emptyStars = 5 - Math.ceil(rating);
    for (var i = 0; i < emptyStars; i++) stars += '&#9734;';
    return stars;
}

// ============================================
// RATING MODAL
// ============================================

var currentSelectedRating = 0;
var currentSellerId = null;
var currentSellerName = null;

function openRatingModal(sellerId, sellerName) {
    var sessionData = localStorage.getItem('supabase_session');
    if (!sessionData) {
        window.location.href = 'login.html?redirect=product-detail.html';
        return;
    }

    currentSellerId = sellerId;
    currentSellerName = sellerName;
    currentSelectedRating = 0;

    var session = JSON.parse(sessionData);
    var userId = session.user.id;

    checkExistingRating(sellerId, userId);
}

async function checkExistingRating(sellerId, userId) {
    try {
        var response = await fetch(
            SUPABASE_URL + '/rest/v1/ratings?seller_id=eq.' + sellerId + '&user_id=eq.' + userId + '&select=rating,comment',
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
                }
            }
        );

        var existingRating = null;
        var existingComment = '';
        if (response.ok) {
            var ratings = await response.json();
            if (ratings && ratings.length > 0) {
                existingRating = ratings[0].rating;
                existingComment = ratings[0].comment || '';
            }
        }

        showRatingModal(existingRating, existingComment);

    } catch (error) {
        console.error('Error checking existing rating:', error);
        showRatingModal(null, '');
    }
}

function showRatingModal(existingRating, existingComment) {
    var existingModal = document.getElementById('ratingModal');
    if (existingModal) {
        existingModal.remove();
    }

    var selectedRating = existingRating || 0;
    currentSelectedRating = selectedRating;

    var starsHtml = '';
    for (var i = 1; i <= 5; i++) {
        var activeClass = i <= selectedRating ? 'active' : '';
        starsHtml += '<span class="star-rating ' + activeClass + '" data-value="' + i + '" onclick="setRating(' + i + ')">&#9733;</span>';
    }

    var modalHtml = `
        <div class="rating-modal-overlay" id="ratingModal">
            <div class="rating-modal-content">
                <button class="rating-modal-close" onclick="closeRatingModal()">&times;</button>
                <h3>Rate ${escapeHtml(currentSellerName)}</h3>
                <p>How was your experience with this seller?</p>
                <div class="rating-stars-container" id="ratingStars">
                    ${starsHtml}
                </div>
                <div class="rating-value-display" id="ratingValueDisplay">
                    ${selectedRating > 0 ? selectedRating + ' out of 5 stars' : 'Select a rating'}
                </div>
                <textarea class="rating-comment" id="ratingComment" placeholder="Leave a comment about your experience (optional)">${escapeHtml(existingComment || '')}</textarea>
                <div class="rating-actions">
                    <button class="btn-submit-rating" id="submitRatingBtn" onclick="submitRating()">
                        ${existingRating ? 'Update Rating' : 'Submit Rating'}
                    </button>
                    <button class="btn-cancel-rating" onclick="closeRatingModal()">Cancel</button>
                </div>
                <div class="rating-error" id="ratingError" style="display:none;"></div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    if (!document.getElementById('ratingModalStyles')) {
        var style = document.createElement('style');
        style.id = 'ratingModalStyles';
        style.textContent = `
            .rating-modal-overlay {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.8);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                display: flex; align-items: center; justify-content: center;
                z-index: 40000; padding: 20px;
                animation: fadeIn 0.3s ease;
            }
            .rating-modal-content {
                background: rgba(10,22,40,0.95);
                backdrop-filter: blur(30px);
                -webkit-backdrop-filter: blur(30px);
                border: 1px solid var(--bubble-glass-border);
                border-radius: 24px;
                max-width: 450px; width: 100%;
                padding: 30px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                position: relative;
                animation: slideUp 0.3s ease;
            }
            .rating-modal-content h3 { color: #fff; font-size: 22px; margin-bottom: 6px; }
            .rating-modal-content p { color: var(--bubble-text-muted); font-size: 14px; margin-bottom: 16px; }
            .rating-modal-close { position: absolute; top: 15px; right: 20px; background: none; border: none; color: var(--bubble-text-muted); font-size: 28px; cursor: pointer; transition: var(--bubble-transition); }
            .rating-modal-close:hover { color: #fff; }
            .rating-stars-container { display: flex; gap: 8px; justify-content: center; margin: 16px 0; }
            .star-rating { font-size: 40px; cursor: pointer; color: #555; transition: var(--bubble-transition); line-height: 1; }
            .star-rating:hover, .star-rating.active { color: #f90; transform: scale(1.1); }
            .rating-value-display { text-align: center; color: var(--bubble-text-muted); font-size: 14px; margin-bottom: 12px; }
            .rating-comment { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.06); border: 1px solid var(--bubble-glass-border); border-radius: 12px; color: #fff; font-size: 14px; outline: none; transition: var(--bubble-transition); font-family: inherit; resize: vertical; min-height: 80px; margin-bottom: 16px; }
            .rating-comment:focus { border-color: var(--bubble-accent); box-shadow: 0 0 0 3px var(--bubble-glow); }
            .rating-comment::placeholder { color: var(--bubble-text-muted); }
            .rating-actions { display: flex; gap: 12px; }
            .btn-submit-rating { flex: 1; padding: 12px; background: linear-gradient(135deg, var(--bubble-accent), var(--bubble-accent2)); color: #fff; border: none; border-radius: 50px; font-weight: 600; font-size: 14px; cursor: pointer; transition: var(--bubble-transition); }
            .btn-submit-rating:hover { transform: translateY(-2px); box-shadow: 0 4px 20px var(--bubble-glow); }
            .btn-submit-rating:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
            .btn-cancel-rating { padding: 12px 24px; background: var(--bubble-glass); color: var(--bubble-text-muted); border: 1px solid var(--bubble-glass-border); border-radius: 50px; font-weight: 600; font-size: 14px; cursor: pointer; transition: var(--bubble-transition); }
            .btn-cancel-rating:hover { background: rgba(255,255,255,0.15); }
            .rating-error { color: #dc3545; margin-top: 10px; font-size: 14px; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @media (max-width: 480px) {
                .rating-modal-content { padding: 20px; margin: 10px; max-width: 100%; }
                .rating-modal-content h3 { font-size: 18px; }
                .rating-modal-content p { font-size: 13px; }
                .star-rating { font-size: 32px; }
                .rating-comment { font-size: 13px; padding: 10px 12px; min-height: 60px; }
                .rating-actions { flex-direction: column; gap: 8px; }
                .btn-submit-rating, .btn-cancel-rating { width: 100%; text-align: center; font-size: 13px; padding: 10px; }
                .rating-modal-close { font-size: 22px; top: 10px; right: 14px; }
            }
            @media (max-width: 360px) { .star-rating { font-size: 28px; } }
        `;
        document.head.appendChild(style);
    }
}

function setRating(value) {
    currentSelectedRating = value;

    var stars = document.querySelectorAll('.star-rating');
    stars.forEach(function(star, index) {
        if (index < value) star.classList.add('active');
        else star.classList.remove('active');
    });

    var display = document.getElementById('ratingValueDisplay');
    if (display) display.textContent = value + ' out of 5 stars';

    var errorEl = document.getElementById('ratingError');
    if (errorEl) errorEl.style.display = 'none';
}

async function submitRating() {
    var rating = currentSelectedRating;
    if (rating === 0) {
        var errorEl = document.getElementById('ratingError');
        if (errorEl) {
            errorEl.textContent = 'Please select a rating (1-5 stars)';
            errorEl.style.display = 'block';
        }
        return;
    }

    var sessionData = localStorage.getItem('supabase_session');
    if (!sessionData) { window.location.href = 'login.html'; return; }

    var session = JSON.parse(sessionData);
    var userId = session.user.id;
    var comment = document.getElementById('ratingComment') ? document.getElementById('ratingComment').value.trim() : '';

    var btn = document.getElementById('submitRatingBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    var errorEl = document.getElementById('ratingError');
    if (errorEl) errorEl.style.display = 'none';

    try {
        var checkResponse = await fetch(
            SUPABASE_URL + '/rest/v1/ratings?seller_id=eq.' + currentSellerId + '&user_id=eq.' + userId + '&select=id',
            { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY } }
        );

        var response;
        if (checkResponse.ok) {
            var existing = await checkResponse.json();
            if (existing && existing.length > 0) {
                response = await fetch(
                    SUPABASE_URL + '/rest/v1/ratings?id=eq.' + existing[0].id,
                    {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
                        body: JSON.stringify({ rating: rating, comment: comment || null, updated_at: new Date().toISOString() })
                    }
                );
            } else {
                response = await fetch(
                    SUPABASE_URL + '/rest/v1/ratings',
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
                        body: JSON.stringify({ seller_id: currentSellerId, user_id: userId, rating: rating, comment: comment || null, created_at: new Date().toISOString() })
                    }
                );
            }
        } else {
            response = await fetch(
                SUPABASE_URL + '/rest/v1/ratings',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
                    body: JSON.stringify({ seller_id: currentSellerId, user_id: userId, rating: rating, comment: comment || null, created_at: new Date().toISOString() })
                }
            );
        }

        if (!response.ok) {
            var errorData = await response.json();
            throw new Error(errorData.message || 'Failed to submit rating');
        }

        showToast('Rating submitted successfully!');
        closeRatingModal();

        setTimeout(function() { location.reload(); }, 1000);

    } catch (error) {
        console.error('Rating error:', error);
        if (errorEl) {
            errorEl.textContent = error.message || 'Failed to submit rating. Please try again.';
            errorEl.style.display = 'block';
        }
        btn.disabled = false;
        btn.textContent = 'Submit Rating';
    }
}

function closeRatingModal() {
    var modal = document.getElementById('ratingModal');
    if (modal) modal.remove();
    currentSelectedRating = 0;
}

// ============================================
// HELPERS
// ============================================

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function addToBasket(productId) {
    var sessionData = localStorage.getItem('supabase_session');
    if (!sessionData) { window.location.href = 'login.html'; return; }
    var session = JSON.parse(sessionData);
    var basketKey = 'basket_' + session.user.id;
    var basket = JSON.parse(localStorage.getItem(basketKey)) || [];

    var product = window.currentProduct;
    if (!product) { showToast('Product not found', true); return; }

    var existingItem = basket.find(function(item) { return item.id == productId; });
    if (existingItem) existingItem.quantity = (existingItem.quantity || 1) + 1;
    else basket.push({ ...product, quantity: 1 });

    localStorage.setItem(basketKey, JSON.stringify(basket));
    var count = basket.reduce(function(sum, item) { return sum + (item.quantity || 1); }, 0);
    updateBasketCount(count);
    showToast('Item added to basket!');
}

function updateBasketCount(count) {
    var el = document.getElementById('basketCount');
    if (el) {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
    }
}

function showToast(message, isError) {
    var toast = document.createElement('div');
    toast.className = 'toast-notification' + (isError ? ' error' : '');
    toast.style.cssText = `
        position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
        background: var(--bubble-glass); backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid var(--bubble-glass-border);
        border-radius: 12px; padding: 14px 28px; color: #fff;
        font-weight: 500; z-index: 99999;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        animation: fadeIn 0.3s ease; max-width: 90%; text-align: center;
        ${isError ? 'border-color: #dc3545;' : ''}
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
}

function showContactModal() {
    showToast('Phone number not available for this seller.', true);
}

// ============================================
// GLOBAL EXPORTS
// ============================================

window.changeMainImage = changeMainImage;
window.openImageLightbox = openImageLightbox;
window.closeImageLightbox = closeImageLightbox;
window.lightboxNext = lightboxNext;
window.lightboxPrev = lightboxPrev;
window.addToBasket = addToBasket;
window.showContactModal = showContactModal;
window.openRatingModal = openRatingModal;
window.setRating = setRating;
window.submitRating = submitRating;
window.closeRatingModal = closeRatingModal;

// ============================================
// INIT
// ============================================

async function initProductDetail() {
    var container = document.getElementById('productDetailContent');
    try {
        var params = getUrlParams();
        var productId = params.productId;

        if (!productId) {
            container.innerHTML = `
                <div class="product-detail-error">
                    <span class="error-icon">&#9888;</span>
                    <h2>No Product Selected</h2>
                    <p>Please provide a product ID to view details.</p>
                    <a href="index.html" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,var(--bubble-accent),var(--bubble-accent2));color:#fff;border-radius:50px;text-decoration:none;font-weight:600;transition:var(--bubble-transition);">Return Home</a>
                </div>
            `;
            return;
        }

        var data = await fetchProductData(productId);
        window.currentProduct = data.product;
        renderProductDetail(data);

    } catch (error) {
        console.error('Product detail error:', error);
        container.innerHTML = `
            <div class="product-detail-error">
                <span class="error-icon">&#9888;</span>
                <h2>Something went wrong</h2>
                <p>${error.message || 'Unable to load product. Please try again later.'}</p>
                <a href="index.html" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,var(--bubble-accent),var(--bubble-accent2));color:#fff;border-radius:50px;text-decoration:none;font-weight:600;transition:var(--bubble-transition);">Return Home</a>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    var sessionData = localStorage.getItem('supabase_session');
    if (sessionData) {
        var session = JSON.parse(sessionData);
        var basket = JSON.parse(localStorage.getItem('basket_' + session.user.id)) || [];
        updateBasketCount(basket.reduce(function(sum, item) { return sum + (item.quantity || 1); }, 0));
    }
});

document.addEventListener('DOMContentLoaded', initProductDetail);
