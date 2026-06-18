// ==================== CONFIGURATION ====================
        window.SUPABASE_URL = 'https://fnncerdxfhwlrdopswpx.supabase.co';
        window.SUPABASE_ANON_KEY = 'sb_publishable_qjN17tdmLu5yvp9iIUBEjg_ZDZCWMhK';
        const IMGBB_API_KEY = '670ea8c38e955ebdfdf84a41489713bf';
        
        // PayNow Bill Payment Links
        const PAYNOW_BASE_150 = 'https://www.paynow.co.zw/Payment/BillPaymentLink/?q=aWQ9MjQ2NzImYW1vdW50PTEuNTAmYW1vdW50X3F1YW50aXR5PTAuMDAmbD0x';
        const PAYNOW_BASE_500 = 'https://www.paynow.co.zw/Payment/BillPaymentLink/?q=aWQ9MjQ2NzkmYW1vdW50PTUuMDAmYW1vdW50X3F1YW50aXR5PTAuMDAmbD0x';
        
        let currentSellerId = null, currentAccessToken = null;
        let currentTier = 'free', subscriptionStatus = 'inactive', subscriptionExpiry = null, autoRenew = true;
        let sellerProducts = [], selectedImageFile = null, renewalCheckInterval = null;

        const tierMap = {
            free: { name: 'Starter Plan', price: 'Free', maxProducts: 8 },
            growth: { name: 'Growth Plan', price: '$1.50/mo', maxProducts: 15 },
            pro: { name: 'Enterprise Plan', price: '$5.00/mo', maxProducts: -1 }
        };

        // ==================== INITIALIZATION & AUTH ====================
        async function checkAuth() {
            currentAccessToken = localStorage.getItem('seller_session_token');
            currentSellerId = localStorage.getItem('seller_id');
            if (!currentAccessToken || !currentSellerId) return false;
            return true;
        }

        async function fetchSubscription() {
            try {
                const response = await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions?seller_id=eq.${currentSellerId}&select=*`, {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${currentAccessToken}`
                    }
                });
                if (!response.ok) {
                    console.warn("Supabase returned a non-200 response for subscriptions. Defaulting to free tier.");
                    return 'free';
                }
                const data = await response.json();
                if (data && data.length > 0) {
                    const sub = data[0];
                    subscriptionStatus = sub.status || 'inactive';
                    subscriptionExpiry = sub.expires_at || null;
                    autoRenew = sub.auto_renew !== undefined ? sub.auto_renew : true;
                    return sub.tier || 'free';
                }
            } catch (err) {
                console.error('Error fetching subscription details from Supabase:', err);
            }
            return 'free';
        }

        // ==================== INVENTORY LOGIC ====================
        async function loadProducts() {
            try {
                const response = await fetch(`${window.SUPABASE_URL}/rest/v1/products?seller_id=eq.${currentSellerId}&select=*`, {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${currentAccessToken}`
                    }
                });
                if (response.ok) {
                    sellerProducts = await response.json();
                    renderProducts();
                    calculateMetrics();
                } else {
                    renderProducts();
                    calculateMetrics();
                }
            } catch (err) {
                console.error('Error loading products:', err);
                renderProducts();
                calculateMetrics();
            }
        }

        function calculateMetrics() {
            let totalVal = 0, totalStk = 0;
            sellerProducts.forEach(p => {
                const qty = parseInt(p.stock) || 0;
                const prc = parseFloat(p.price) || 0;
                totalStk += qty;
                totalVal += (qty * prc);
            });
            document.getElementById('totalProducts').innerText = sellerProducts.length;
            document.getElementById('totalStock').innerText = totalStk;
            document.getElementById('totalValue').innerText = '$' + totalVal.toFixed(2);
        }

        function renderProducts() {
            const list = document.getElementById('productsList');
            list.innerHTML = '';
            if (sellerProducts.length === 0) {
                list.innerHTML = '<p style="color:#666;grid-column:1/-1;text-align:center;padding:40px 0;">No products listed yet.</p>';
                return;
            }
            sellerProducts.forEach(p => {
                const card = document.createElement('div');
                card.className = 'product-card' + (p.status === 'paused' ? ' paused' : '');
                card.innerHTML = `
                    <img src="${p.image_url || 'https://via.placeholder.com/280x220'}" alt="${p.title}">
                    <div class="product-info">
                        <h4 style="margin-bottom:8px;font-size:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.title}</h4>
                        <p style="color:#666;font-size:13px;margin-bottom:12px;height:36px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${p.description || 'No description provided.'}</p>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                            <span style="font-size:18px;font-weight:700;color:#B12704;">$${parseFloat(p.price).toFixed(2)}</span>
                            <span style="font-size:12px;color:#666;background:#f0f2f2;padding:4px 8px;border-radius:4px;">Stock: ${p.stock}</span>
                        </div>
                        <div style="display:flex;gap:8px;">
                            <button class="btn-secondary" style="flex:1;padding:6px;font-size:12px;" onclick="editStock('${p.id}', ${p.stock})">Stock</button>
                            <button class="btn-danger" style="padding:6px 12px;font-size:12px;background:#dc3545;" onclick="deleteProduct('${p.id}')">Delete</button>
                        </div>
                    </div>
                `;
                list.appendChild(card);
            });
        }

        async function editStock(id, curr) {
            const val = prompt('Enter new stock quantity:', curr);
            if (val === null || val.trim() === '') return;
            const num = parseInt(val);
            if (isNaN(num) || num < 0) {
                showToast('Please enter a valid stock number.', true);
                return;
            }
            try {
                const response = await fetch(`${window.SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${currentAccessToken}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({ stock: num })
                });
                if (response.ok) {
                    showToast('Stock quantity updated successfully.');
                    await loadProducts();
                    enforceProductLimit();
                }
            } catch (err) {
                showToast('Failed to update stock density.', true);
            }
        }

        async function deleteProduct(id) {
            if (!confirm('Are you sure you want to delete this product listing?')) return;
            try {
                const response = await fetch(`${window.SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
                    method: 'DELETE',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${currentAccessToken}`
                    }
                });
                if (response.ok) {
                    showToast('Product successfully removed.');
                    await loadProducts();
                    enforceProductLimit();
                }
            } catch (err) {
                showToast('Failed to complete background erasure handling.', true);
            }
        }

        function enforceProductLimit() {
            const limit = tierMap[currentTier].maxProducts;
            const activeCountSpan = document.getElementById('activeCount');
            const maxCountSpan = document.getElementById('maxCount');
            const tierNameSpan = document.getElementById('tierName');
            const banner = document.getElementById('productLimitBanner');
            
            if (activeCountSpan) activeCountSpan.innerText = sellerProducts.length;
            if (maxCountSpan) maxCountSpan.innerText = limit === -1 ? 'Unlimited' : limit;
            if (tierNameSpan) tierNameSpan.innerText = tierMap[currentTier].name;

            if (limit !== -1 && sellerProducts.length >= limit) {
                if (banner) banner.style.display = 'block';
            } else {
                if (banner) banner.style.display = 'none';
            }
        }

        // ==================== IMAGE FILE CAPTURE HANDLERS ====================
        function handleFileSelect(e) {
            const file = e.target.files[0];
            if (file) processSelectedImage(file);
        }

        function processSelectedImage(file) {
            if (!file.type.startsWith('image/')) {
                showToast('Please upload a valid image file container.', true);
                return;
            }
            selectedImageFile = file;
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('uploadArea').style.display = 'none';
                document.getElementById('imagePreviewContainer').style.display = 'block';
                document.getElementById('imagePreview').src = e.target.result;
            };
            reader.readAsDataURL(file);
            uploadImageToImgBB();
        }

        function removeImage() {
            selectedImageFile = null;
            document.getElementById('prodImage').value = '';
            document.getElementById('imagePreviewContainer').style.display = 'none';
            document.getElementById('uploadArea').style.display = 'block';
            document.getElementById('imageFileInput').value = '';
            document.getElementById('imageStatus').innerText = '';
        }

        async function uploadImageToImgBB() {
            if (!selectedImageFile) return;
            const bar = document.getElementById('uploadProgressBar');
            const fill = document.getElementById('uploadProgressFill');
            const stat = document.getElementById('imageStatus');
            const btn = document.getElementById('submitProductBtn');

            bar.style.display = 'block';
            fill.style.width = '10%';
            stat.innerText = 'Uploading asset to image relay CDN...';
            btn.disabled = true;

            const fd = new FormData();
            fd.append('image', selectedImageFile);

            try {
                fill.style.width = '40%';
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: fd
                });
                fill.style.width = '80%';
                const res = await response.json();
                if (res && res.data && res.data.url) {
                    fill.style.width = '100%';
                    document.getElementById('prodImage').value = res.data.url;
                    stat.innerHTML = '<span style="color:#28a745;font-weight:600;">✓ Image verified and synchronized successfully.</span>';
                } else {
                    throw new Error('Invalid cloud infrastructure body response structure.');
                }
            } catch (err) {
                stat.innerHTML = '<span style="color:#dc3545;font-weight:600;">✕ Upload protocol crashed. Please retry execution loop.</span>';
                removeImage();
            } finally {
                setTimeout(() => { bar.style.display = 'none'; }, 800);
                btn.disabled = false;
            }
        }

        async function handleAddProduct() {
            const title = document.getElementById('prodTitle').value.trim();
            const category = document.getElementById('prodCategory').value;
            const desc = document.getElementById('prodDescription').value.trim();
            const price = parseFloat(document.getElementById('prodPrice').value);
            const stock = parseInt(document.getElementById('prodStock').value);
            const imgUrl = document.getElementById('prodImage').value;

            if (!title || !category || isNaN(price) || isNaN(stock) || !imgUrl) {
                showToast('Please populate all highlighted metric parameters.', true);
                return;
            }

            const limit = tierMap[currentTier].maxProducts;
            if (limit !== -1 && sellerProducts.length >= limit) {
                showToast('Plan limitations capped out. Please adjust or elevate membership bounds.', true);
                return;
            }

            try {
                const response = await fetch(`${window.SUPABASE_URL}/rest/v1/products`, {
                    method: 'POST',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${currentAccessToken}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        seller_id: currentSellerId,
                        title: title,
                        category: category,
                        description: desc,
                        price: price,
                        stock: stock,
                        image_url: imgUrl,
                        status: 'active'
                    })
                });

                if (response.ok) {
                    showToast('Product successfully saved to public showcase index.');
                    document.getElementById('productForm').reset();
                    removeImage();
                    toggleProductForm();
                    await loadProducts();
                    enforceProductLimit();
                } else {
                    showToast('Asset save failure. Data parsing reject context flag detected.', true);
                }
            } catch (err) {
                showToast('Database insertion exception encountered.', true);
            }
        }

        function toggleProductForm() {
            const form = document.getElementById('addProductForm');
            const btn = document.getElementById('toggleFormBtn');
            if (form.style.display === 'none') {
                form.style.display = 'block';
                btn.innerText = 'Close Panel';
                btn.className = 'btn-secondary';
            } else {
                form.style.display = 'none';
                btn.innerText = '+ Add Product';
                btn.className = 'btn-primary';
            }
        }

        // ==================== SUBSCRIPTION TIERS INTERACTION LAYER ====================
        function renderTiers() {
            const container = document.getElementById('tierContainer');
            container.innerHTML = '';
            
            Object.keys(tierMap).forEach(key => {
                const tier = tierMap[key];
                const isCurrent = currentTier === key;
                const card = document.createElement('div');
                card.className = 'tier-card' + (isCurrent ? ' tier-highlight' : '');
                
                let actionBtn = '';
                if (isCurrent) {
                    actionBtn = `<button class="btn-success" style="width:100%;" disabled>Active Assignment</button>`;
                } else if (key === 'free') {
                    actionBtn = `<button class="btn-secondary" style="width:100%;" disabled>Downgrade Blocked</button>`;
                } else {
                    actionBtn = `<button class="btn-primary" style="width:100%;" onclick="handleSubscribeClick('${key}')">Upgrade Membership</button>`;
                }

                card.innerHTML = `
                    <div style="margin-bottom:8px;">${isCurrent ? '<span class="badge-pro">CURRENT SELECTION</span>' : ''}</div>
                    <h3>${tier.name}</h3>
                    <div class="tier-price">${tier.price}</div>
                    <p style="color:#666;font-size:13px;margin-bottom:20px;">Allows up to ${tier.maxProducts === -1 ? 'unlimited' : tier.maxProducts} simultaneous item listings.</p>
                    ${actionBtn}
                `;
                container.appendChild(card);
            });
        }

        async function handleSubscribeClick(targetTier) {
            showToast('Initializing subscription database allocation sequence...');
            
            localStorage.setItem(`mbare_pending_upgrade_${currentSellerId}`, targetTier);
            localStorage.setItem(`mbare_pending_timestamp_${currentSellerId}`, new Date().getTime());

            try {
                // Check if a subscription record row entry already exists for this seller
                const checkRes = await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions?seller_id=eq.${currentSellerId}&select=*`, {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${currentAccessToken}`
                    }
                });
                
                const existingData = await checkRes.json();
                let dbSuccess = false;

                if (existingData && existingData.length > 0) {
                    // Row exists: update the existing allocation row parameters to 'Pending' tracking state
                    const updateRes = await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions?seller_id=eq.${currentSellerId}`, {
                        method: 'PATCH',
                        headers: {
                            'apikey': window.SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${currentAccessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            tier: targetTier,
                            status: 'Pending',
                            auto_renew: true
                        })
                    });
                    if (updateRes.ok) dbSuccess = true;
                } else {
                    // Row does not exist: create and push a fresh subscription row directly to the empty table
                    const insertRes = await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions`, {
                        method: 'POST',
                        headers: {
                            'apikey': window.SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${currentAccessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            seller_id: currentSellerId,
                            tier: targetTier,
                            status: 'Pending',
                            auto_renew: true
                        })
                    });
                    if (insertRes.ok) dbSuccess = true;
                }

                if (dbSuccess) {
                    console.log(`Successfully populated registration track parameters in Supabase for tier: ${targetTier}`);
                    
                    // Launch payment gateway portal configuration redirect route
                    const payUrl = targetTier === 'growth' ? PAYNOW_BASE_150 : PAYNOW_BASE_500;
                    window.open(payUrl, '_blank');
                } else {
                    showToast('Database pipeline instantiation rejected. Please check connection logs.', true);
                }

            } catch (err) {
                console.error('Subscription insertion protocol sequence error context:', err);
                showToast('Failed to communicate safely with database cluster core.', true);
            }
        }

        function checkLocalStoragePaymentStatus() {
            const pending = localStorage.getItem(`mbare_pending_upgrade_${currentSellerId}`);
            if (pending) {
                showToast('Pending transaction sequence cache detected. Monitoring background updates.');
            }
        }

        function updateSubscriptionControls() {
            const ctrl = document.getElementById('subscriptionControls');
            if (currentTier === 'free') {
                ctrl.style.display = 'none';
                return;
            }
            ctrl.style.display = 'block';
            ctrl.innerHTML = `
                <div style="background:white;padding:20px;border-radius:16px;border:1px solid #e2e8f0;display:inline-block;margin-top:15px;">
                    <span style="font-size:14px;margin-right:15px;font-weight:500;">Auto-Renew System: <strong>${autoRenew ? 'ENABLED' : 'DISABLED'}</strong></span>
                    <button class="${autoRenew ? 'btn-danger' : 'btn-success'}" style="padding:6px 14px;font-size:12px;" onclick="toggleAutoRenew()">
                        ${autoRenew ? 'Disable Auto-Renew' : 'Enable Auto-Renew'}
                    </button>
                </div>
            `;
        }

        async function toggleAutoRenew() {
            try {
                const response = await fetch(`${window.SUPABASE_URL}/rest/v1/seller_subscriptions?seller_id=eq.${currentSellerId}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${currentAccessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ auto_renew: !autoRenew })
                });
                if (response.ok) {
                    autoRenew = !autoRenew;
                    showToast(`Auto-renewal rules safely changed to ${autoRenew ? 'active automated tracking' : 'manual tracking status'}.`);
                    updateSubscriptionControls();
                }
            } catch (err) {
                showToast('Failed to overwrite registration renewal constants.', true);
            }
        }

        function updateExpiryBanner() {
            const banner = document.getElementById('expiryBanner');
            if (currentTier === 'free' || !subscriptionExpiry) {
                banner.style.display = 'none';
                return;
            }
            const exp = new Date(subscriptionExpiry);
            const now = new Date();
            const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
            banner.style.display = 'block';

            if (diffDays < 0) {
                banner.className = 'expiry-banner expired';
                banner.innerHTML = `<strong>Membership Expired!</strong> Your current premium verification window completely timed out. Active allocations have defaulted back to the baseline tier bounds. <span class="inline-link" onclick="showUpgradeOptions()">Re-initiate authorization stack now</span>.`;
            } else if (diffDays <= 5) {
                banner.className = 'expiry-banner warning';
                banner.innerHTML = `<strong>Subscription Expiring Soon!</strong> You have roughly ${diffDays} days remaining before limits reset to default tier boundaries.`;
            } else {
                banner.className = 'expiry-banner info';
                banner.innerHTML = `Premium parameters assigned successfully. Automatic tracking window active until: <strong>${exp.toLocaleDateString()}</strong>.`;
            }
        }

        function handleExpiredSubscription() {
            currentTier = 'free';
            subscriptionStatus = 'expired';
            localStorage.setItem(`mbare_tier_${currentSellerId}`, 'free');
            renderTiers();
            updateExpiryBanner();
            updateSubscriptionControls();
            enforceProductLimit();
            showToast('Subscription validation lifecycle lapsed. Falling back to default baseline limits.', true);
        }

        function showUpgradeOptions() {
            window.scrollTo({
                top: document.getElementById('tierContainer').offsetTop - 100,
                behavior: 'smooth'
            });
        }

        // ==================== TOAST LAYER NOTIFICATIONS ====================
        function showToast(msg, isError = false) {
            const exist = document.querySelector('.toast-notification');
            if (exist) exist.remove();

            const toast = document.createElement('div');
            toast.className = 'toast-notification' + (isError ? ' error' : '');
            toast.innerText = msg;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(20px)';
                toast.style.transition = 'all 0.4s ease';
                setTimeout(() => toast.remove(), 400);
            }, 4000);
        }

        function updateViewShopButton() {
            const btn = document.getElementById('viewShopBtn');
            if (btn && currentSellerId) {
                btn.href = `shop.html?id=${currentSellerId}`;
            }
        }

        document.getElementById('analyticsNavBtn').addEventListener('click', () => {
            const limit = tierMap[currentTier].maxProducts;
            if (limit !== -1 && sellerProducts.length >= limit) {
                showUpgradeOptions();
                return;
            }
            window.location.href = 'seller-analytics.html';
        });

        function startExpiryChecker() {
            if (renewalCheckInterval) clearInterval(renewalCheckInterval);
            renewalCheckInterval = setInterval(async () => {
                if (currentTier === 'free' || !subscriptionExpiry) return;
                if (new Date(subscriptionExpiry) < new Date() && subscriptionStatus === 'active') {
                    handleExpiredSubscription();
                }
            }, 60000);
        }

        async function init() {
            if (!await checkAuth()) return;
            
            console.log('Dashboard initializing...');
            
            checkLocalStoragePaymentStatus();
            
            const sub = await fetchSubscription();
            currentTier = sub || localStorage.getItem(`mbare_tier_${currentSellerId}`) || 'free';
            localStorage.setItem(`mbare_tier_${currentSellerId}`, currentTier);
            await loadProducts();
            renderTiers();
            updateExpiryBanner();
            updateSubscriptionControls();
            startExpiryChecker();
            
            // ENFORCE LIMITS ON LOAD
            enforceProductLimit();
            
            document.getElementById('loadingOverlay').style.display = 'none';
            updateViewShopButton();
        }
        
        // Expose function globally to let the HTML loop trigger configuration activation when status switches to 'Paid'
        window.initializeDashboardData = function() {
            console.log("Global handshake verified. Launching core layout data engine.");
            init();
        };
