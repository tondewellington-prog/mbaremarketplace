window.SUPABASE_URL = 'https://fnncerdxfhwlrdopswpx.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_qjN17tdmLu5yvp9iIUBEjg_ZDZCWMhK';

let currentSeller = null;
let allProducts = [];
let filteredProducts = [];
let selectedCategory = 'All';
let sellerRating = { average: 0, count: 0 };

// Get seller ID from URL
const urlParams = new URLSearchParams(window.location.search);
const sellerId = urlParams.get('seller') || urlParams.get('id');

console.log('Seller ID from URL:', sellerId);

if (!sellerId) {
    document.getElementById('shopContent').innerHTML = `
        <div class="error" style="padding:80px 20px;">
            <h2>Seller Not Found</h2>
            <p>No seller specified. Please go back and try again.</p>
            <a href="index.html" style="display:inline-block;margin-top:20px;padding:10px 30px;background:#f90;color:white;text-decoration:none;border-radius:8px;">Go Home</a>
        </div>
    `;
} else {
    loadShop(sellerId);
}

async function loadShop(sellerId) {
    try {
        console.log('Loading seller data for ID:', sellerId);
        
        // Get seller from the sellers table
        let sellerResp = await fetch(`${window.SUPABASE_URL}/rest/v1/sellers?user_id=eq.${sellerId}&select=*`, {
            headers: { 
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
            }
        });
        
        let sellers = [];
        if (sellerResp.ok) {
            sellers = await sellerResp.json();
            console.log('Sellers found:', sellers);
        }
        
        // If no seller found with user_id, try with id
        if (!sellers || sellers.length === 0) {
            console.log('Trying with id field...');
            sellerResp = await fetch(`${window.SUPABASE_URL}/rest/v1/sellers?id=eq.${sellerId}&select=*`, {
                headers: { 
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            });
            if (sellerResp.ok) {
                sellers = await sellerResp.json();
                console.log('Sellers found with id:', sellers);
            }
        }
        
        if (!sellers || sellers.length === 0) {
            console.log('No seller found, creating fallback');
            currentSeller = {
                user_id: sellerId,
                business_name: 'Seller',
                full_name: 'Seller',
                business_address: 'Zimbabwe',
                business_phone: '',
                business_email: '',
                email: '',
                profile_image: '',
                cover_image: '',
                shop_description: 'Welcome to my shop! Please check out my products.',
                shop_verified: false,
                shop_joined_date: new Date().toISOString()
            };
        } else {
            currentSeller = sellers[0];
            console.log('Seller loaded:', currentSeller);
        }

        // Load products for this seller
        console.log('Loading products for seller:', sellerId);
        const prodResp = await fetch(`${window.SUPABASE_URL}/rest/v1/products?seller_id=eq.${sellerId}&select=*&order=created_at.desc`, {
            headers: { 
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
            }
        });
        
        if (prodResp.ok) {
            allProducts = await prodResp.json() || [];
            console.log('Products loaded:', allProducts.length);
        } else {
            console.warn('Failed to load products, status:', prodResp.status);
            allProducts = [];
        }
        
        // Load seller ratings
        try {
            const ratingResp = await fetch(`${window.SUPABASE_URL}/rest/v1/ratings?seller_id=eq.${sellerId}&select=rating`, {
                headers: { 
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            });
            const ratings = ratingResp.ok ? await ratingResp.json() : [];
            if (ratings && ratings.length > 0) {
                const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
                sellerRating.average = sum / ratings.length;
                sellerRating.count = ratings.length;
            }
        } catch (e) {
            console.warn('Failed to load ratings:', e);
        }
        
        filteredProducts = [...allProducts];
        renderShop();

    } catch (e) {
        console.error('Load error:', e);
        document.getElementById('shopContent').innerHTML = `
            <div class="error" style="padding:80px 20px;">
                <h2>Error Loading Shop</h2>
                <p>${e.message || 'Please try again later.'}</p>
                <a href="index.html" style="display:inline-block;margin-top:20px;padding:10px 30px;background:#f90;color:white;text-decoration:none;border-radius:8px;">Go Home</a>
            </div>
        `;
    }
}

function getCategories() {
    const cats = {};
    allProducts.forEach(p => {
        const cat = p.category || 'Other';
        cats[cat] = (cats[cat] || 0) + 1;
    });
    return cats;
}

function getSellerDisplayName() {
    if (!currentSeller) return 'Seller Shop';
    return currentSeller.business_name || currentSeller.full_name || currentSeller.shop_name || 'Seller Shop';
}

function getSellerPhone() {
    if (!currentSeller) return '';
    return currentSeller.business_phone || currentSeller.phone || currentSeller.contact_phone || '';
}

function getSellerEmail() {
    if (!currentSeller) return '';
    return currentSeller.business_email || currentSeller.email || '';
}

function getSellerAddress() {
    if (!currentSeller) return 'Zimbabwe';
    return currentSeller.business_address || currentSeller.address || currentSeller.location || 'Zimbabwe';
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';
    for (let i = 0; i < fullStars; i++) {
        stars += '★';
    }
    if (hasHalfStar) {
        stars += '½';
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        stars += '☆';
    }
    return stars;
}

function renderShop() {
    const categories = getCategories();
    const uniqueCategories = Object.keys(categories);
    const sellerName = getSellerDisplayName();
    const sellerPhone = getSellerPhone();
    const sellerEmail = getSellerEmail();
    const sellerAddress = getSellerAddress();
    const profileImage = currentSeller.profile_image || '';
    const coverImage = currentSeller.cover_image || '';
    const shopDescription = currentSeller.shop_description || 'Welcome to my shop! Please check out my products.';
    const verified = currentSeller.shop_verified || false;
    const joinedDate = currentSeller.shop_joined_date ? new Date(currentSeller.shop_joined_date).toLocaleDateString() : 'Recently';
    const ratingDisplay = sellerRating.count > 0 ? sellerRating.average.toFixed(1) : '0.0';
    const ratingText = sellerRating.count > 0 ? `(${sellerRating.count} ratings)` : '(No ratings)';
    const avatarLetter = sellerName.charAt(0).toUpperCase();
    
    const html = `
        <div class="shop-banner">
            <div class="shop-cover">
                ${coverImage ? `<img src="${coverImage}" alt="Cover">` : ''}
            </div>
            <div class="shop-profile-section">
                <div class="container">
                    <div class="shop-header">
                        <div class="shop-avatar">
                            ${profileImage ? `<img src="${profileImage}" alt="${sellerName}">` : `<div class="placeholder">${avatarLetter}</div>`}
                        </div>
                        <div class="shop-info">
                            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                                <h1>${sellerName}</h1>
                                ${verified ? '<span class="verified-badge" style="display:inline-block;">Verified</span>' : ''}
                            </div>
                            <p class="description">${shopDescription}</p>
                            <div class="details">
                                <span>Location: ${sellerAddress}</span>
                                ${sellerPhone ? `<span>Phone: ${sellerPhone}</span>` : ''}
                                <span>Joined: ${joinedDate}</span>
                            </div>
                            <div class="shop-stats">
                                <div class="shop-stat"><div class="num">${allProducts.length}</div><div class="label">Products</div></div>
                                <div class="shop-stat"><div class="num">${uniqueCategories.length}</div><div class="label">Categories</div></div>
                                <div class="shop-stat"><div class="rating">${ratingDisplay}</div><div class="label">Rating ${ratingText}</div></div>
                            </div>
                            ${sellerPhone ? `<a href="https://wa.me/${sellerPhone.replace(/[^0-9]/g,'')}?text=Hello!%20I%20am%20interested%20in%20your%20products%20on%20Mbare%20Marketplace" target="_blank" class="contact-btn">Contact via WhatsApp</a>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="container" style="margin-top:20px;">
            <div class="main-content">
                <div class="sidebar">
                    <div class="sidebar-section">
                        <h3>Categories</h3>
                        <ul class="category-list">
                            <li class="${selectedCategory === 'All' ? 'active' : ''}" onclick="filterByCategory('All')">All Products <span class="count">(${allProducts.length})</span></li>
                            ${uniqueCategories.map(cat => `
                                <li class="${selectedCategory === cat ? 'active' : ''}" onclick="filterByCategory('${cat.replace(/'/g, "\\'")}')">${cat} <span class="count">(${categories[cat]})</span></li>
                            `).join('')}
                        </ul>
                    </div>
                    <div class="sidebar-section">
                        <h3>Search Products</h3>
                        <input type="text" class="search-box" placeholder="Search in this shop..." id="searchInput" oninput="searchProducts()">
                        <select class="sort-select" id="sortSelect" onchange="sortProducts()">
                            <option value="newest">Newest First</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                            <option value="name">Name: A-Z</option>
                        </select>
                    </div>
                </div>
                <div class="products-area">
                    <h2 style="margin-bottom:20px;color:#333;">${selectedCategory === 'All' ? 'All Products' : selectedCategory} <span style="font-size:16px;font-weight:400;color:#999;">(${filteredProducts.length})</span></h2>
                    ${filteredProducts.length > 0 ? `
                        <div class="products-grid">
                            ${filteredProducts.map(p => `
                                <div class="product-card" onclick="viewProduct('${p.id}')">
                                    <img src="${p.image_url || 'https://placehold.co/400x300?text=No+Image'}" alt="${p.title || 'Product'}" onerror="this.src='https://placehold.co/400x300?text=No+Image'">
                                    <div class="info">
                                        <div class="title">${p.title || 'Untitled'}</div>
                                        <div class="price">$${parseFloat(p.price || 0).toFixed(2)}</div>
                                        <div class="stock">Stock: ${p.stock || 0}</div>
                                        <span class="category-tag">${p.category || 'Other'}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="no-products">
                            <div class="icon">📦</div>
                            <h3>No products found</h3>
                            <p>Try changing your search or filter</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('shopContent').innerHTML = html;
}

function filterByCategory(category) {
    selectedCategory = category;
    if (category === 'All') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(p => p.category === category);
    }
    renderShop();
}

function searchProducts() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const base = selectedCategory === 'All' ? allProducts : allProducts.filter(p => p.category === selectedCategory);
    if (query) {
        filteredProducts = base.filter(p => (p.title || '').toLowerCase().includes(query) || (p.description || '').toLowerCase().includes(query));
    } else {
        filteredProducts = base;
    }
    renderShop();
}

function sortProducts() {
    const sort = document.getElementById('sortSelect').value;
    if (sort === 'newest') filteredProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sort === 'price-low') filteredProducts.sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0));
    else if (sort === 'price-high') filteredProducts.sort((a, b) => parseFloat(b.price || 0) - parseFloat(a.price || 0));
    else if (sort === 'name') filteredProducts.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    renderShop();
}

function viewProduct(productId) {
    window.location.href = `product-detail.html?id=${productId}`;
}
