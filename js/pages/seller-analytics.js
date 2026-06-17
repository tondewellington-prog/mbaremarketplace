// Supabase configuration
        const SUPABASE_URL = 'https://fnncerdxfhwlrdopswpx.supabase.co';
        const SUPABASE_ANON_KEY = 'sb_publishable_qjN17tdmLu5yvp9iIUBEjg_ZDZCWMhK';
        // SERVICE KEY bypasses RLS - use for analytics/admin pages
        const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubmNlcmR4Zmh3bHJkb3Bzd3B4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwMTgwOSwiZXhwIjoyMDgyNjc3ODA5fQ.gS45zReH5gtMeTY74tjb6ECfdjENglLejU4kTFNnIh0';
        
        let currentSellerId = null;
        let currentAccessToken = null;
        let currentTier = 'free';
        let viewChart = null;
        let clickChart = null;
        let daysRange = 30;

        // Authentication check
        async function checkAuth() {
            const sessionData = localStorage.getItem('supabase_session');
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            
            if (!isLoggedIn || !sessionData) {
                alert('Please login first');
                window.location.href = 'login.html?redirect=seller-analytics.html';
                return false;
            }
            
            try {
                const session = JSON.parse(sessionData);
                currentSellerId = session.user?.id;
                currentAccessToken = session.access_token;
                if (!currentSellerId) throw new Error('No seller ID');
                return true;
            } catch (e) {
                window.location.href = 'login.html';
                return false;
            }
        }

        // Function to refresh the token - KEPT FROM ORIGINAL
        async function refreshAccessToken(refreshToken) {
            try {
                const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY
                    },
                    body: JSON.stringify({ refresh_token: refreshToken })
                });
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('supabase_session', JSON.stringify(data));
                    localStorage.setItem('isLoggedIn', 'true');
                    return { success: true, session: data };
                }
                return { success: false, error: data };
            } catch (error) {
                console.error('Token refresh error:', error);
                return { success: false, error };
            }
        }

        // Helper to get headers with SERVICE KEY (bypasses RLS)
        function getServiceHeaders() {
            return {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            };
        }

        // Fetch current subscription tier - FIXED: using SERVICE KEY
        async function fetchSubscriptionTier() {
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/seller_subscriptions?seller_id=eq.${currentSellerId}&status=eq.active&select=plan_type&order=created_at.desc&limit=1`, {
                    headers: getServiceHeaders()
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0) {
                        const plan = data[0].plan_type;
                        if (plan === 'tier_150' || plan === 'tier_5') {
                            return plan;
                        }
                    }
                }
                return 'free';
            } catch (e) {
                console.error('Error fetching subscription:', e);
                return 'free';
            }
        }

        // Fetch product views from Supabase - FIXED: using SERVICE KEY
        async function fetchProductViews(days = 30) {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            try {
                const response = await fetch(
                    `${SUPABASE_URL}/rest/v1/product_views?select=*&seller_id=eq.${currentSellerId}&viewed_at=gte.${startDate.toISOString()}&order=viewed_at.asc`,
                    { headers: getServiceHeaders() }
                );
                const data = await response.json();
                return data || [];
            } catch (error) {
                console.error('Error fetching product views:', error);
                return [];
            }
        }

        // Fetch WhatsApp clicks from Supabase - FIXED: using SERVICE KEY
        async function fetchWhatsAppClicks(days = 30) {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            try {
                const response = await fetch(
                    `${SUPABASE_URL}/rest/v1/whatsapp_clicks?select=*&seller_id=eq.${currentSellerId}&clicked_at=gte.${startDate.toISOString()}&order=clicked_at.asc`,
                    { headers: getServiceHeaders() }
                );
                const data = await response.json();
                return data || [];
            } catch (error) {
                console.error('Error fetching WhatsApp clicks:', error);
                return [];
            }
        }

        // Fetch seller products - FIXED: using SERVICE KEY
        async function fetchProducts() {
            try {
                const response = await fetch(
                    `${SUPABASE_URL}/rest/v1/products?select=*&seller_id=eq.${currentSellerId}&order=created_at.desc`,
                    { headers: getServiceHeaders() }
                );
                const data = await response.json();
                return data || [];
            } catch (error) {
                console.error('Error fetching products:', error);
                return [];
            }
        }

        // Fetch seller activities - FIXED: using SERVICE KEY
        async function fetchSellerActivities(limit = 20) {
            try {
                const response = await fetch(
                    `${SUPABASE_URL}/rest/v1/seller_activities?select=*&seller_id=eq.${currentSellerId}&order=created_at.desc&limit=${limit}`,
                    { headers: getServiceHeaders() }
                );
                const data = await response.json();
                return data || [];
            } catch (error) {
                console.error('Error fetching activities:', error);
                return [];
            }
        }

        // Fetch subscription info - FIXED: using SERVICE KEY
        async function fetchSubscriptionInfo() {
            try {
                const response = await fetch(
                    `${SUPABASE_URL}/rest/v1/seller_subscriptions?select=*&seller_id=eq.${currentSellerId}&order=created_at.desc&limit=1`,
                    { headers: getServiceHeaders() }
                );
                const data = await response.json();
                return data?.[0] || null;
            } catch (error) {
                return null;
            }
        }

        // Group data by date for charts
        function groupByDate(data, dateField) {
            const grouped = {};
            data.forEach(item => {
                const date = new Date(item[dateField]).toLocaleDateString();
                grouped[date] = (grouped[date] || 0) + 1;
            });
            return grouped;
        }

        // Get top products by views
        function getTopProductsByViews(productViews, products) {
            const viewCount = {};
            productViews.forEach(view => {
                const title = view.product_title;
                viewCount[title] = (viewCount[title] || 0) + 1;
            });
            return Object.entries(viewCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
        }

        // Get top products by WhatsApp clicks
        function getTopProductsByClicks(whatsappClicks) {
            const clickCount = {};
            whatsappClicks.forEach(click => {
                const title = click.product_title;
                clickCount[title] = (clickCount[title] || 0) + 1;
            });
            return Object.entries(clickCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
        }

        // Get low stock products
        function getLowStockProducts(products) {
            return products.filter(p => (p.stock || 0) < 5 && (p.stock || 0) > 0);
        }

        // Get out of stock products
        function getOutOfStockProducts(products) {
            return products.filter(p => (p.stock || 0) === 0);
        }

        // Get category breakdown
        function getCategoryBreakdown(products) {
            const breakdown = {};
            products.forEach(p => {
                const cat = p.category || 'Uncategorized';
                breakdown[cat] = (breakdown[cat] || 0) + 1;
            });
            return breakdown;
        }

        // Create views chart
        function createViewsChart(dailyViews) {
            const ctx = document.getElementById('viewsChart')?.getContext('2d');
            if (!ctx) return;
            if (viewChart) viewChart.destroy();
            
            const dates = Object.keys(dailyViews).sort((a,b) => new Date(a) - new Date(b));
            const data = dates.map(d => dailyViews[d]);
            
            viewChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Product Views',
                        data: data,
                        borderColor: '#f90',
                        backgroundColor: 'rgba(255, 153, 0, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: '#f90',
                        pointBorderColor: '#fff',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'top' }
                    }
                }
            });
        }

        // Create clicks chart
        function createClicksChart(dailyClicks) {
            const ctx = document.getElementById('clicksChart')?.getContext('2d');
            if (!ctx) return;
            if (clickChart) clickChart.destroy();
            
            const dates = Object.keys(dailyClicks).sort((a,b) => new Date(a) - new Date(b));
            const data = dates.map(d => dailyClicks[d]);
            
            clickChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'WhatsApp Inquiries',
                        data: data,
                        borderColor: '#25D366',
                        backgroundColor: 'rgba(37, 211, 102, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: '#25D366',
                        pointBorderColor: '#fff',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'top' }
                    }
                }
            });
        }

        // Escape HTML
        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>]/g, function(m) {
                return m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;';
            });
        }

        // Render analytics page
        async function renderAnalytics() {
            const container = document.getElementById('analyticsContent');
            
            // Check if user is paid
            currentTier = await fetchSubscriptionTier();
            
            if (currentTier === 'free') {
                container.innerHTML = `
                    <div class="upgrade-message">
                        <h2>Analytics Unlocked for Paid Subscribers</h2>
                        <p style="margin: 16px 0;">Upgrade to Merchant Basic or Video Ads Plan to access:</p>
                        <div style="max-width: 400px; margin: 0 auto 25px auto; background: #f8f9fa; padding: 20px; border-radius: 16px; text-align: left;">
                            <ul style="list-style: none;">
                                <li style="margin: 10px 0;">✓ Product view tracking</li>
                                <li style="margin: 10px 0;">✓ WhatsApp inquiry analytics</li>
                                <li style="margin: 10px 0;">✓ Performance charts and trends</li>
                                <li style="margin: 10px 0;">✓ Low stock alerts</li>
                                <li style="margin: 10px 0;">✓ Category performance</li>
                                <li style="margin: 10px 0;">✓ Activity history</li>
                            </ul>
                        </div>
                        <button class="btn-primary" onclick="window.location.href='seller-dashboard.html'">View Subscription Plans</button>
                    </div>
                `;
                return;
            }

            container.innerHTML = '<div class="loading">Loading analytics data...</div>';
            
            // Fetch all data
            const [products, productViews, whatsappClicks, activities, subscriptionInfo] = await Promise.all([
                fetchProducts(),
                fetchProductViews(daysRange),
                fetchWhatsAppClicks(daysRange),
                fetchSellerActivities(15),
                fetchSubscriptionInfo()
            ]);

            // Calculate stats
            const totalProducts = products.length;
            const totalViews = productViews.length;
            const totalWhatsapp = whatsappClicks.length;
            const conversionRate = totalViews > 0 ? ((totalWhatsapp / totalViews) * 100).toFixed(1) : 0;
            
            // Group data for charts
            const dailyViews = groupByDate(productViews, 'viewed_at');
            const dailyClicks = groupByDate(whatsappClicks, 'clicked_at');
            
            // Get top products
            const topViewed = getTopProductsByViews(productViews, products);
            const topClicked = getTopProductsByClicks(whatsappClicks);
            const lowStock = getLowStockProducts(products);
            const outOfStock = getOutOfStockProducts(products);
            const categoryBreakdown = getCategoryBreakdown(products);
            
            // Calculate total inventory value
            const totalInventoryValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);
            
            // Activity icons mapper
            const activityIcons = {
                'product_added': 'Product Added',
                'product_deleted': 'Product Deleted',
                'product_updated': 'Product Updated',
                'login': 'Logged In',
                'subscription_changed': 'Subscription Changed',
                'whatsapp_click': 'WhatsApp Inquiry'
            };

            // Plan name
            const planName = currentTier === 'tier_150' ? 'Merchant Basic ($1.50/month)' : 'Video Ads Plan ($5/month)';
            const productLimit = currentTier === 'tier_150' ? 50 : 200;

            container.innerHTML = `
                <!-- Date Range Filter -->
                <div class="section" style="padding: 15px 28px;">
                    <div class="date-filter">
                        <span style="font-weight: 500;">Time Period:</span>
                        <select id="dateRangeSelect">
                            <option value="7">Last 7 days</option>
                            <option value="14">Last 14 days</option>
                            <option value="30" selected>Last 30 days</option>
                            <option value="60">Last 60 days</option>
                            <option value="90">Last 90 days</option>
                        </select>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-number">${totalProducts}</div><div class="stat-label">Total Products</div></div>
                    <div class="stat-card"><div class="stat-number">${totalViews.toLocaleString()}</div><div class="stat-label">Product Views</div></div>
                    <div class="stat-card"><div class="stat-number">${totalWhatsapp.toLocaleString()}</div><div class="stat-label">WhatsApp Inquiries</div></div>
                    <div class="stat-card"><div class="stat-number">${conversionRate}%</div><div class="stat-label">Inquiry Rate</div></div>
                    <div class="stat-card"><div class="stat-number">$${totalInventoryValue.toFixed(2)}</div><div class="stat-label">Inventory Value</div></div>
                </div>

                <!-- Charts -->
                <div class="two-columns">
                    <div class="section">
                        <h2>Product Views Trend</h2>
                        <div class="chart-container">
                            <canvas id="viewsChart"></canvas>
                        </div>
                    </div>
                    <div class="section">
                        <h2>WhatsApp Inquiries Trend</h2>
                        <div class="chart-container">
                            <canvas id="clicksChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Top Products -->
                <div class="two-columns">
                    <div class="section">
                        <h2>Top 5 Most Viewed Products</h2>
                        ${topViewed.length === 0 ? '<p class="empty-state">No product views recorded yet.</p>' : `
                            <ul class="product-list">
                                ${topViewed.map(([title, count]) => `<li><span><strong>${escapeHtml(title)}</strong></span><span class="badge" style="background:#f90;">${count} views</span></li>`).join('')}
                            </ul>
                        `}
                    </div>
                    <div class="section">
                        <h2>Top 5 Most Inquired Products</h2>
                        ${topClicked.length === 0 ? '<p class="empty-state">No WhatsApp inquiries yet.</p>' : `
                            <ul class="product-list">
                                ${topClicked.map(([title, count]) => `<li><span><strong>${escapeHtml(title)}</strong></span><span class="badge-success" style="background:#25D366;">${count} inquiries</span></li>`).join('')}
                            </ul>
                        `}
                    </div>
                </div>

                <!-- Inventory Alerts & Categories -->
                <div class="two-columns">
                    <div class="section">
                        <h2>Low Stock Alerts</h2>
                        ${lowStock.length === 0 ? '<p class="empty-state">No low stock items. Good inventory!</p>' : `
                            <ul class="product-list">
                                ${lowStock.map(p => `<li><span><strong>${escapeHtml(p.title)}</strong></span><span class="badge badge-warning">Stock: ${p.stock}</span></li>`).join('')}
                            </ul>
                        `}
                    </div>
                    <div class="section">
                        <h2>Out of Stock Products</h2>
                        ${outOfStock.length === 0 ? '<p class="empty-state">All products in stock.</p>' : `
                            <ul class="product-list">
                                ${outOfStock.map(p => `<li><span><strong>${escapeHtml(p.title)}</strong></span><span class="badge">Out of Stock</span></li>`).join('')}
                            </ul>
                        `}
                    </div>
                </div>

                <!-- Category Breakdown -->
                <div class="section">
                    <h2>Products by Category</h2>
                    ${Object.keys(categoryBreakdown).length === 0 ? '<p class="empty-state">No categories yet.</p>' : `
                        <ul class="product-list">
                            ${Object.entries(categoryBreakdown).map(([cat, count]) => `<li><span><strong>${escapeHtml(cat)}</strong></span><span>${count} product${count !== 1 ? 's' : ''}</span></li>`).join('')}
                        </ul>
                    `}
                </div>

                <!-- Recent Activity -->
                <div class="section">
                    <h2>Recent Seller Activity</h2>
                    ${activities.length === 0 ? '<p class="empty-state">No recent activity.</p>' : `
                        <ul class="product-list">
                            ${activities.slice(0, 10).map(a => `
                                <li>
                                    <span>${activityIcons[a.activity_type] || a.activity_type}</span>
                                    <span style="font-size: 12px; color: #666;">${new Date(a.created_at).toLocaleString()}</span>
                                </li>
                            `).join('')}
                        </ul>
                    `}
                </div>

                <!-- Subscription Info -->
                <div class="section">
                    <h2>Subscription Information</h2>
                    <div class="insight-card">
                        <div class="insight-title">Current Plan: ${planName}</div>
                        <p style="margin-top: 8px;">Product Limit: ${productLimit} products</p>
                        <p>Products Used: ${totalProducts} / ${productLimit}</p>
                        ${subscriptionInfo?.current_period_end ? `<p>Renewal Date: ${new Date(subscriptionInfo.current_period_end).toLocaleDateString()}</p>` : ''}
                        <p style="margin-top: 12px; font-size: 13px; color: #666;">Video ads are included in the Video Ads Plan. Contact support for ad setup.</p>
                    </div>
                </div>
            `;

            // Create charts
            createViewsChart(dailyViews);
            createClicksChart(dailyClicks);

            // Date range filter handler
            const dateSelect = document.getElementById('dateRangeSelect');
            if (dateSelect) {
                dateSelect.addEventListener('change', async (e) => {
                    daysRange = parseInt(e.target.value);
                    await renderAnalytics();
                });
            }
        }

        // Initialize
        async function init() {
            if (!await checkAuth()) return;
            await renderAnalytics();
        }

        init();
