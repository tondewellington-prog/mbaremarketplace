// ============================================
// Analytics Dashboard JavaScript - FIXED iOS DETECTION
// ============================================

// Set correct Supabase URL and keys
window.SUPABASE_URL = 'https://fnncerdxfhwlrdopswpx.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_qjN17tdmLu5yvp9iIUBEjg_ZDZCWMhK';

// Service role key (bypasses RLS)
window.SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubmNlcmR4Zmh3bHJkb3Bzd3B4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwMTgwOSwiZXhwIjoyMDgyNjc3ODA5fQ.gS45zReH5gtMeTY74tjb6ECfdjENglLejU4kTFNnIh0';

console.log('Analytics Dashboard Initialized');

// Version control
const DASHBOARD_VERSION = '2.5.0';

// Check version on load
(function() {
    const storedVersion = localStorage.getItem('analytics_dashboard_version');
    if (storedVersion !== DASHBOARD_VERSION) {
        localStorage.setItem('analytics_dashboard_version', DASHBOARD_VERSION);
    }
})();

let charts = {};

document.addEventListener('DOMContentLoaded', function() {
    checkAdminAccess();
    updateHeader();
});

function updateHeader() {
    if (window.uiCommon) {
        window.uiCommon.updateHeaderForLoggedInUser({
            accountLabelId: 'accountLabel',
            accountLinkId: 'accountLink',
            logoutBtnId: 'logoutBtn'
        });
    }
}

function checkAdminAccess() {
    const sessionData = localStorage.getItem('supabase_session');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    if (!isLoggedIn || !sessionData) {
        document.getElementById('analyticsContent').innerHTML = `
            <div class="no-access">
                <h2>Access Restricted</h2>
                <p>Please login to view analytics.</p>
                <a href="login.html?redirect=analytics.html" class="btn-home">Login</a>
            </div>
        `;
        return;
    }

    const session = JSON.parse(sessionData);
    const userEmail = session.user?.email || '';
    const adminEmails = ['tondewellington@gmail.com', 'admin@mbare.com'];

    if (!adminEmails.includes(userEmail)) {
        document.getElementById('analyticsContent').innerHTML = `
            <div class="no-access">
                <h2>Admin Access Only</h2>
                <p>You don't have permission to view analytics.</p>
                <a href="index.html" class="btn-home">Go Home</a>
            </div>
        `;
        return;
    }

    loadAnalytics();
}

async function loadAnalytics() {
    try {
        // Check if Chart.js loaded
        if (typeof Chart === 'undefined') {
            document.getElementById('analyticsContent').innerHTML = `
                <div class="no-access">
                    <h2>Chart.js Loading Failed</h2>
                    <p>Please disable tracking prevention for this site or try a different browser.</p>
                    <button onclick="loadAnalytics()" class="btn-home">Try Again</button>
                </div>
            `;
            return;
        }

        // Show loading state
        document.getElementById('analyticsContent').innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading analytics...</p>
            </div>
        `;

        // Fetch all data in parallel for speed
        const [users, sellers, products, activities, downloads] = await Promise.all([
            fetch(`${window.SUPABASE_URL}/rest/v1/users?select=id,created_at`, {
                headers: { 'apikey': window.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${window.SUPABASE_SERVICE_KEY}` }
            }).then(r => r.json()),
            fetch(`${window.SUPABASE_URL}/rest/v1/sellers?select=id,created_at`, {
                headers: { 'apikey': window.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${window.SUPABASE_SERVICE_KEY}` }
            }).then(r => r.json()),
            fetch(`${window.SUPABASE_URL}/rest/v1/products?select=id,created_at`, {
                headers: { 'apikey': window.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${window.SUPABASE_SERVICE_KEY}` }
            }).then(r => r.json()),
            fetch(`${window.SUPABASE_URL}/rest/v1/user_activities?select=user_id,created_at`, {
                headers: { 'apikey': window.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${window.SUPABASE_SERVICE_KEY}` }
            }).then(r => r.json()),
            fetch(`${window.SUPABASE_URL}/rest/v1/app_downloads?select=*`, {
                headers: { 'apikey': window.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${window.SUPABASE_SERVICE_KEY}` }
            }).then(r => r.json())
        ]);

        // Process statistics
        const stats = {
            totalUsers: users.length,
            totalSellers: sellers.length,
            totalProducts: products.length,
            activeToday: [...new Set(activities.filter(a =>
                a.created_at?.startsWith(new Date().toISOString().split('T')[0])
            ).map(a => a.user_id))].length,
            userGrowth: [...new Set(activities.filter(a =>
                new Date(a.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ).map(a => a.user_id))].length
        };

        stats.sellerPercentage = stats.totalUsers ? ((stats.totalSellers / stats.totalUsers) * 100).toFixed(1) : 0;
        stats.avgPerSeller = stats.totalSellers ? (stats.totalProducts / stats.totalSellers).toFixed(1) : 0;
        stats.activeRate = stats.totalUsers ? ((stats.activeToday / stats.totalUsers) * 100).toFixed(1) : 0;

        // Process download stats with FIXED iOS detection
        const downloadStats = processDownloadStats(downloads);

        // Process chart data
        const chartData = processChartData(users, activities, sellers, products);

        // Render dashboard
        renderDashboard(stats, chartData, downloadStats);

    } catch (error) {
        console.error('Error loading analytics:', error);
        document.getElementById('analyticsContent').innerHTML = `
            <div class="no-access">
                <h2>Error Loading Data</h2>
                <p>${error.message}</p>
                <button onclick="loadAnalytics()" class="btn-home">Try Again</button>
            </div>
        `;
    }
}

function processDownloadStats(downloads) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // FIX: Reclassify macOS devices that are actually iOS
    const fixedDownloads = downloads.map(d => {
        const fixed = { ...d };

        if (fixed.download_type === 'pwa_install' && fixed.os === 'macos') {
            const ua = fixed.user_agent?.toLowerCase() || '';
            if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod') ||
                (ua.includes('mac') && ua.includes('mobile'))) {
                fixed.os = 'ios';
            }
        }
        return fixed;
    });

    // Count by type
    const installClicks = downloads.filter(d => d.download_type === 'install_click').length;
    const pwaInstalls = fixedDownloads.filter(d => d.download_type === 'pwa_install').length;
    const addToHomeScreen = downloads.filter(d => d.download_type === 'add_to_home_screen').length;
    const installPrompts = downloads.filter(d => d.download_type === 'install_prompt_shown').length;

    // Today's installs
    const todayInstalls = fixedDownloads.filter(d =>
        d.download_type === 'pwa_install' && d.timestamp?.startsWith(today)
    ).length;

    // Yesterday's installs
    const yesterdayInstalls = fixedDownloads.filter(d =>
        d.download_type === 'pwa_install' && d.timestamp?.startsWith(yesterday)
    ).length;

    // Daily downloads for chart
    const dailyDownloads = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        dailyDownloads.push(fixedDownloads.filter(d =>
            d.download_type === 'pwa_install' && d.timestamp?.startsWith(date)
        ).length);
    }

    // Device breakdown for installs only
    const byDevice = {
        mobile: fixedDownloads.filter(d => d.download_type === 'pwa_install' && d.device_type === 'mobile').length,
        desktop: fixedDownloads.filter(d => d.download_type === 'pwa_install' && d.device_type === 'desktop').length,
        tablet: fixedDownloads.filter(d => d.download_type === 'pwa_install' && d.device_type === 'tablet').length,
        other: fixedDownloads.filter(d => d.download_type === 'pwa_install' && (!d.device_type || d.device_type === 'unknown')).length
    };

    // OS breakdown for installs only (with fixed iOS detection)
    const byOS = {
        android: fixedDownloads.filter(d => d.download_type === 'pwa_install' && d.os === 'android').length,
        ios: fixedDownloads.filter(d => d.download_type === 'pwa_install' && d.os === 'ios').length,
        windows: fixedDownloads.filter(d => d.download_type === 'pwa_install' && d.os === 'windows').length,
        macos: fixedDownloads.filter(d => d.download_type === 'pwa_install' && d.os === 'macos' &&
            !fixedDownloads.some(orig => orig.id === d.id && orig.os === 'macos' &&
                (orig.user_agent?.toLowerCase().includes('iphone') ||
                    orig.user_agent?.toLowerCase().includes('ipad')))).length,
        linux: fixedDownloads.filter(d => d.download_type === 'pwa_install' && d.os === 'linux').length,
        other: fixedDownloads.filter(d => d.download_type === 'pwa_install' && (!d.os || d.os === 'unknown')).length
    };

    // Percentages
    const percentages = {
        mobile: pwaInstalls ? ((byDevice.mobile / pwaInstalls) * 100).toFixed(1) : 0,
        desktop: pwaInstalls ? ((byDevice.desktop / pwaInstalls) * 100).toFixed(1) : 0,
        tablet: pwaInstalls ? ((byDevice.tablet / pwaInstalls) * 100).toFixed(1) : 0,
        other: pwaInstalls ? ((byDevice.other / pwaInstalls) * 100).toFixed(1) : 0
    };

    // Top device and OS
    const topDevice = Object.entries(byDevice).reduce((a, b) => a[1] > b[1] ? a : b)[0] || 'Unknown';
    const topOS = Object.entries(byOS).reduce((a, b) => a[1] > b[1] ? a : b)[0] || 'Unknown';

    return {
        totalDownloads: pwaInstalls,
        downloadsToday: todayInstalls,
        downloadsYesterday: yesterdayInstalls,
        pwaInstallsYesterday: yesterdayInstalls,
        installClicks,
        pwaInstalls,
        addToHomeScreen,
        installPrompts,
        conversionRate: installClicks ? ((pwaInstalls / installClicks) * 100).toFixed(1) : 0,
        byDevice,
        byOS,
        percentages,
        dailyDownloads,
        topDevice,
        topOS
    };
}

function processChartData(users, activities, sellers, products) {
    const labels = [];
    const usersData = [];
    const activitiesData = [];
    const sellersData = [];
    const productsData = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        labels.push(date.substring(5));

        usersData.push(users.filter(u => u.created_at?.startsWith(date)).length);
        activitiesData.push(activities.filter(a => a.created_at?.startsWith(date)).length);
        sellersData.push(sellers.filter(s => s.created_at?.startsWith(date)).length);
        productsData.push(products.filter(p => p.created_at?.startsWith(date)).length);
    }

    return { labels, users: usersData, activities: activitiesData, sellers: sellersData, products: productsData };
}

function renderDashboard(stats, chartData, downloadStats) {
    document.getElementById('analyticsContent').innerHTML = `
        <div class="analytics-header">
            <h1>Mbare Marketplace Analytics</h1>
            <div>
                <span class="badge badge-success badge-spaced">v${DASHBOARD_VERSION}</span>
                <span class="badge badge-info badge-spaced">Last updated: ${new Date().toLocaleString()}</span>
                <button class="refresh-btn" onclick="loadAnalytics()">Refresh</button>
            </div>
        </div>

        <!-- User Statistics -->
        <h2 class="section-title">User Statistics</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">U</div>
                <div class="stat-label">Total Users</div>
                <div class="stat-number">${stats.totalUsers}</div>
                <div class="stat-change">${stats.userGrowth} active last 7d</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">S</div>
                <div class="stat-label">Total Sellers</div>
                <div class="stat-number">${stats.totalSellers}</div>
                <div class="stat-change">${stats.sellerPercentage}% of users</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">P</div>
                <div class="stat-label">Total Products</div>
                <div class="stat-number">${stats.totalProducts}</div>
                <div class="stat-change">Avg ${stats.avgPerSeller} per seller</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">A</div>
                <div class="stat-label">Active Today</div>
                <div class="stat-number">${stats.activeToday}</div>
                <div class="stat-change">${stats.activeRate}% active rate</div>
            </div>
        </div>

        <!-- App Download Statistics -->
        <h2 class="section-title">App Download Statistics</h2>
        <div class="stats-grid">
            <div class="stat-card app-download">
                <div class="stat-icon">D</div>
                <div class="stat-label">Total Downloads</div>
                <div class="stat-number">${downloadStats.pwaInstalls}</div>
                <div class="stat-change">${downloadStats.downloadsToday} today</div>
            </div>
            <div class="stat-card app-download">
                <div class="stat-icon">C</div>
                <div class="stat-label">Install Clicks</div>
                <div class="stat-number">${downloadStats.installClicks}</div>
                <div class="stat-change">${downloadStats.conversionRate}% conversion</div>
            </div>
            <div class="stat-card app-download">
                <div class="stat-icon">I</div>
                <div class="stat-label">Successful Installs</div>
                <div class="stat-number">${downloadStats.pwaInstalls}</div>
                <div class="stat-change">${downloadStats.pwaInstalls - downloadStats.pwaInstallsYesterday} from yesterday</div>
            </div>
            <div class="stat-card app-download">
                <div class="stat-icon">H</div>
                <div class="stat-label">Add to Home Screen</div>
                <div class="stat-number">${downloadStats.addToHomeScreen}</div>
                <div class="stat-change">iOS users</div>
            </div>
        </div>

        <!-- Download Funnel -->
        <div class="funnel-card">
            <h4 class="funnel-title">Download Funnel</h4>
            <div class="funnel-row">
                <div class="funnel-step funnel-step-blue">
                    <div class="funnel-value">${downloadStats.installClicks}</div>
                    <div class="funnel-label">Install Clicks</div>
                </div>
                <div class="funnel-arrow">to</div>
                <div class="funnel-step funnel-step-teal">
                    <div class="funnel-value">${downloadStats.pwaInstalls}</div>
                    <div class="funnel-label">Successful Installs</div>
                </div>
                <div class="funnel-arrow">to</div>
                <div class="funnel-step funnel-step-orange">
                    <div class="funnel-value">${downloadStats.conversionRate}%</div>
                    <div class="funnel-label">Conversion Rate</div>
                </div>
            </div>
        </div>

        <!-- Device Breakdown -->
        <h3 class="subsection-title">Downloads by Device</h3>
        <div class="device-stats-grid">
            <div class="device-stat-card">
                <div class="device-icon">M</div>
                <div class="device-label">Mobile</div>
                <div class="device-count">${downloadStats.byDevice.mobile}</div>
                <div class="device-percent">${downloadStats.percentages.mobile}%</div>
            </div>
            <div class="device-stat-card">
                <div class="device-icon">D</div>
                <div class="device-label">Desktop</div>
                <div class="device-count">${downloadStats.byDevice.desktop}</div>
                <div class="device-percent">${downloadStats.percentages.desktop}%</div>
            </div>
            <div class="device-stat-card">
                <div class="device-icon">T</div>
                <div class="device-label">Tablet</div>
                <div class="device-count">${downloadStats.byDevice.tablet}</div>
                <div class="device-percent">${downloadStats.percentages.tablet}%</div>
            </div>
            <div class="device-stat-card">
                <div class="device-icon">O</div>
                <div class="device-label">Other</div>
                <div class="device-count">${downloadStats.byDevice.other}</div>
                <div class="device-percent">${downloadStats.percentages.other}%</div>
            </div>
        </div>

        <!-- OS Breakdown (FIXED) -->
        <h3 class="subsection-title">Downloads by OS</h3>
        <div class="os-breakdown-grid">
            <div class="os-item"><div class="os-icon">A</div><div class="os-name">Android</div><div class="os-count">${downloadStats.byOS.android}</div></div>
            <div class="os-item"><div class="os-icon">i</div><div class="os-name">iOS</div><div class="os-count">${downloadStats.byOS.ios}</div></div>
            <div class="os-item"><div class="os-icon">W</div><div class="os-name">Windows</div><div class="os-count">${downloadStats.byOS.windows}</div></div>
            <div class="os-item"><div class="os-icon">M</div><div class="os-name">macOS</div><div class="os-count">${downloadStats.byOS.macos}</div></div>
            <div class="os-item"><div class="os-icon">L</div><div class="os-name">Linux</div><div class="os-count">${downloadStats.byOS.linux}</div></div>
            <div class="os-item"><div class="os-icon">O</div><div class="os-name">Other</div><div class="os-count">${downloadStats.byOS.other}</div></div>
        </div>

        <!-- Charts -->
        <h2 class="section-title">Trends (Last 7 Days)</h2>
        <div class="charts-grid">
            <div class="chart-container"><div class="chart-title">New Users</div><canvas id="usersChart"></canvas></div>
            <div class="chart-container"><div class="chart-title">User Activity</div><canvas id="activityChart"></canvas></div>
            <div class="chart-container"><div class="chart-title">App Downloads</div><canvas id="downloadsChart"></canvas></div>
            <div class="chart-container full-width"><div class="chart-title">New Sellers & Products</div><canvas id="productChart"></canvas></div>
        </div>

        <!-- Insights -->
        <div class="insights-grid">
            <div class="insight-card">
                <h4 class="insight-title">Event Breakdown</h4>
                <div class="insight-row"><span>Install Clicks:</span><span class="insight-value">${downloadStats.installClicks}</span></div>
                <div class="insight-row"><span>PWA Installs:</span><span class="insight-value insight-value-success">${downloadStats.pwaInstalls}</span></div>
                <div class="insight-row"><span>Add to Home Screen:</span><span class="insight-value">${downloadStats.addToHomeScreen}</span></div>
                <div class="insight-row insight-row-total"><span>Conversion Rate:</span><span class="insight-value insight-value-success">${downloadStats.conversionRate}%</span></div>
            </div>
            <div class="insight-card insight-card-wide">
                <h4 class="insight-title">Quick Insights</h4>
                <p>- <strong>${downloadStats.pwaInstalls}</strong> people have successfully installed the app</p>
                <p>- <strong>${downloadStats.installClicks - downloadStats.pwaInstalls}</strong> people clicked but didn't complete</p>
                <p>- Most downloads from <strong>${downloadStats.topDevice}</strong> devices</p>
                <p>- Top operating system: <strong>${downloadStats.topOS}</strong></p>
            </div>
        </div>

        <!-- Recent Activities -->
        <div class="recent-activities" id="recentActivities">
            ${getRecentActivitiesHTML()}
        </div>
    `;

    // Create charts
    setTimeout(() => {
        createChart('usersChart', chartData.labels, chartData.users, '#b388ff');
        createChart('activityChart', chartData.labels, chartData.activities, '#7c4dff');
        createChart('downloadsChart', chartData.labels, downloadStats.dailyDownloads, '#3f51b5');
        createProductSellerChart('productChart', chartData.labels, chartData.sellers, chartData.products);
    }, 50);
}

function createChart(elementId, labels, data, color) {
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx) return;
    if (charts[elementId]) charts[elementId].destroy();

    charts[elementId] = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ data, backgroundColor: color, borderRadius: 4 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: { color: 'rgba(255,255,255,0.7)' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    ticks: { color: 'rgba(255,255,255,0.7)' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            }
        }
    });
}

function createProductSellerChart(elementId, labels, sellers, products) {
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx) return;
    if (charts[elementId]) charts[elementId].destroy();

    charts[elementId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'New Sellers', data: sellers, borderColor: '#b388ff', backgroundColor: 'rgba(179,136,255,0.1)', tension: 0.4, fill: true },
                { label: 'New Products', data: products, borderColor: '#7c4dff', backgroundColor: 'rgba(124,77,255,0.1)', tension: 0.4, fill: true }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: 'rgba(255,255,255,0.7)' } }
            },
            scales: {
                x: {
                    ticks: { color: 'rgba(255,255,255,0.7)' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    ticks: { color: 'rgba(255,255,255,0.7)' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            }
        }
    });
}

function getRecentActivitiesHTML() {
    return `
        <div class="activities-header">
            <h2>Recent Activities</h2>
            <button class="refresh-btn refresh-btn-small" onclick="loadAnalytics()">Refresh</button>
        </div>
        <p class="activities-empty">Refresh to load recent activities</p>
    `;
}

function updateHeader() {
    const sessionData = localStorage.getItem('supabase_session');
    if (sessionData) {
        document.getElementById('logoutBtn').style.display = 'inline-block';
        const email = JSON.parse(sessionData).user?.email || 'User';
        document.querySelector('.account-label').textContent = `Hello, ${email.split('@')[0]}`;
    }
}

window.logout = function() {
    localStorage.clear();
    window.location.href = 'index.html';
};

window.handleSearch = function() {
    const query = document.getElementById('searchInput').value;
    if (query) window.location.href = `search-results.html?q=${encodeURIComponent(query)}`;
};
