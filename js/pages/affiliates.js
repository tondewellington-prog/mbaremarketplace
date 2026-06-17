const SUPABASE_URL = 'https://fnncerdxfhwlrdopswpx.supabase.co';
        const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubmNlcmR4Zmh3bHJkb3Bzd3B4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwMTgwOSwiZXhwIjoyMDgyNjc3ODA5fQ.gS45zReH5gtMeTY74tjb6ECfdjENglLejU4kTFNnIh0';
        let currentAffiliateId = null, currentSellerId = null;
        let clicksChart = null, earningsChart = null, clicksPieChart = null, conversionsPieChart = null;

        function getAuthHeaders() {
            return {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            };
        }

        function getNextPayoutDate() { const today = new Date(); return new Date(today.getFullYear(), today.getMonth() + 1, 5); }

        // Check subscription using AUTH UUID directly from seller_subscriptions table
        async function isUserActiveSubscribedSeller(authUserId) {
            if (!authUserId) return false;
            try {
                const headers = getAuthHeaders();
                const today = new Date().toISOString();
                console.log('Checking subscription for user:', authUserId);
                
                const response = await fetch(
                    `${SUPABASE_URL}/rest/v1/seller_subscriptions?seller_id=eq.${authUserId}&status=eq.active&end_date>gt.${today}&select=id,plan_type`,
                    { headers }
                );
                
                if (!response.ok) {
                    console.error('Subscription fetch failed:', response.status);
                    return false;
                }
                
                const subscriptions = await response.json();
                console.log('Subscriptions found:', subscriptions);
                return subscriptions && subscriptions.length > 0;
            } catch (error) {
                console.error('Error checking subscription:', error);
                return false;
            }
        }

        function showSubscriptionRequired() {
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="access-message">
                        <h2>Active Subscription Required</h2>
                        <p>You need an active seller subscription to participate in the affiliate program and earn commissions.</p>
                        <p>Subscribe now to start earning $0.10 per month for every new seller you refer!</p>
                        <div class="btn-group">
                            <a href="seller-register.html" class="btn-primary">Register as Seller</a>
                            <a href="subscription.html" class="btn-outline">View Subscription Plans</a>
                        </div>
                    </div>
                `;
            }
            const loading = document.getElementById('loadingOverlay');
            if (loading) loading.style.display = 'none';
        }

        function initEmptyCharts() {
            const ctx1 = document.getElementById('clicksChart')?.getContext('2d');
            const ctx2 = document.getElementById('earningsChart')?.getContext('2d');
            if (ctx1) clicksChart = new Chart(ctx1, { type: 'pie', data: { labels: ['Not Converted', 'Converted'], datasets: [{ data: [0, 0], backgroundColor: ['#e7e9ec', '#28a745'] }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } } });
            if (ctx2) earningsChart = new Chart(ctx2, { type: 'doughnut', data: { labels: ['Paid Out', 'Pending'], datasets: [{ data: [0, 0], backgroundColor: ['#28a745', '#f90'] }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } } });
        }

        async function ensureAffiliateRecord() {
            if (!currentSellerId) return null;
            const headers = getAuthHeaders();
            try {
                const resp = await fetch(`${SUPABASE_URL}/rest/v1/affiliates?seller_id=eq.${currentSellerId}&select=*`, { headers });
                if (resp.ok) { const data = await resp.json(); if (data?.length) { currentAffiliateId = data[0].id; return data[0]; } }
                const affiliateCode = 'AFF_' + currentSellerId.substring(0,6) + '_' + Math.random().toString(36).substr(2,8).toUpperCase();
                const create = await fetch(`${SUPABASE_URL}/rest/v1/affiliates`, { method: 'POST', headers: { ...headers, 'Prefer': 'return=representation' }, body: JSON.stringify({ seller_id: currentSellerId, affiliate_code: affiliateCode, tier: 'bronze', total_referrals: 0, total_earnings: 0, unpaid_earnings: 0, paid_earnings: 0, total_clicks: 0, converted_clicks: 0, status: 'active', joined_date: new Date().toISOString(), last_active: new Date().toISOString() }) });
                if (create.ok) { const newAff = await create.json(); if (newAff?.length) { currentAffiliateId = newAff[0].id; return newAff[0]; } }
            } catch(e) { console.error(e); }
            return null;
        }

        async function fetchData(endpoint) {
            const headers = getAuthHeaders();
            try { const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, { headers }); if (!res.ok) return []; return await res.json(); } catch(e) { return []; }
        }

        function generateSocialLinks(affiliateCode) {
            const domain = window.location.origin;
            const baseUrl = `${domain}/seller-register.html?ref=${affiliateCode}`;
            const platforms = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'Threads', 'WhatsApp', 'X'];
            const container = document.getElementById('socialLinksContainer');
            if (container) container.innerHTML = platforms.map(p => `<div class="social-link-card"><span>${p}</span><input type="text" class="social-link-input" value="${baseUrl}&utm_source=${p.toLowerCase()}" readonly onclick="this.select();copyToClipboard(this.value)"></div>`).join('');
        }

        window.copyToClipboard = function(text) { navigator.clipboard.writeText(text).then(() => showCopyMessage('Link copied!')); };
        function showCopyMessage(msg) { const d = document.createElement('div'); d.className = 'copy-success'; d.innerHTML = msg; document.body.appendChild(d); setTimeout(() => d.remove(), 2000); }
        window.copyReferralLink = function() { const inp = document.getElementById('referralLink'); inp.select(); document.execCommand('copy'); showCopyMessage('Referral link copied!'); };
        window.handleSearch = function() { const query = document.getElementById('searchInput')?.value; if(query) window.location.href = `search-results.html?q=${encodeURIComponent(query)}`; };

        async function updateDashboard() {
            if (!currentAffiliateId) return;
            try {
                const affiliate = (await fetchData(`affiliates?id=eq.${currentAffiliateId}&select=*`))?.[0] || {};
                const referrals = await fetchData(`referrals?affiliate_id=eq.${currentAffiliateId}&select=*`);
                const clicks = await fetchData(`affiliate_clicks?affiliate_id=eq.${currentAffiliateId}&select=*`);
                const earnings = await fetchData(`affiliate_earnings?affiliate_id=eq.${currentAffiliateId}&select=*`);
                
                const completed = referrals.filter(r => r.status === 'completed');
                const totalClicks = clicks.length, convertedClicks = clicks.filter(c => c.converted === true).length;
                const totalEarn = earnings.reduce((s,e)=>s+(e.amount||0),0);
                const pendingEarn = earnings.filter(e=>e.status==='pending').reduce((s,e)=>s+(e.amount||0),0);
                const paidEarn = earnings.filter(e=>e.status==='paid').reduce((s,e)=>s+(e.amount||0),0);
                const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate()-30); 
                const recentClicks = clicks.filter(c => new Date(c.click_date) > thirtyDays).length;
                const affiliateCode = affiliate.affiliate_code || ('AFF_' + (currentSellerId?.substring(0,8) || Math.random().toString(36).substr(2,8).toUpperCase()));
                
                document.getElementById('totalClicks').innerText = totalClicks;
                document.getElementById('totalReferrals').innerText = completed.length;
                document.getElementById('totalEarnings').innerHTML = `$${totalEarn.toFixed(2)}`;
                document.getElementById('unpaidEarnings').innerHTML = `$${pendingEarn.toFixed(2)}`;
                document.getElementById('yourCode').innerHTML = affiliateCode;
                document.getElementById('yourReferrals').innerHTML = completed.length;
                document.getElementById('yourEarnings').innerHTML = `$${totalEarn.toFixed(2)}`;
                document.getElementById('yourClicks30d').innerHTML = recentClicks;
                document.getElementById('yourTier').innerHTML = (affiliate.tier || 'bronze').charAt(0).toUpperCase() + (affiliate.tier || 'bronze').slice(1);
                document.getElementById('activeSubscribers').innerHTML = completed.length;
                document.getElementById('churnedCount').innerHTML = referrals.filter(r=>r.status==='pending').length;
                document.getElementById('pendingPayout').innerHTML = `$${pendingEarn.toFixed(2)}`;
                document.getElementById('totalPaid').innerHTML = `$${paidEarn.toFixed(2)}`;
                document.getElementById('nextPayoutDate').innerHTML = getNextPayoutDate().toLocaleDateString();
                document.getElementById('bronzeProgress').innerHTML = Math.min(completed.length,500);
                document.getElementById('silverProgress').innerHTML = Math.min(Math.max(0, completed.length-500),500);
                document.getElementById('goldProgress').innerHTML = Math.max(0, completed.length-1000);
                document.getElementById('totalReferredCount').innerText = referrals.length;
                
                ['bronze','silver','gold'].forEach(t => document.getElementById(`${t}Card`).classList.remove('tier-highlight'));
                const currentTier = affiliate.tier || 'bronze';
                document.getElementById(`${currentTier}Card`).classList.add('tier-highlight');
                document.getElementById('referralLink').value = `${window.location.origin}/seller-register.html?ref=${affiliateCode}`;
                generateSocialLinks(affiliateCode);
                
                const recentBody = document.getElementById('recentReferrals');
                const recent = completed.slice(0,10);
                recentBody.innerHTML = recent.length ? recent.map(r => `<tr><td>${new Date(r.completion_date || r.referral_date).toLocaleDateString()}</td><td>${r.referred_plan === 'tier_5' ? '$5 Plan' : '$1.50 Plan'}</td><td>$${(r.commission_earned || 0).toFixed(2)}</td><td><span style="color:#28a745;">Completed</span></td></tr>`).join('') : '<tr><td colspan="4" class="text-center placeholder-text">No referral activity yet</td></tr>';
                
                const sourceMap = new Map();
                clicks.forEach(click => { 
                    let src = click.utm_source || click.source_domain || 'Direct'; 
                    if(!sourceMap.has(src)) sourceMap.set(src, { clicks: 0, conversions: 0, revenue: 0 }); 
                    let d = sourceMap.get(src); 
                    d.clicks++; 
                    if(click.converted) { d.conversions++; const ref = referrals.find(r=>r.referred_seller_id === click.converted_to_seller_id); if(ref) d.revenue += ref.commission_earned || 0; } 
                });
                
                const sources = Array.from(sourceMap.entries()).map(([n,d]) => ({ source: n, clicks: d.clicks, conversions: d.conversions, convRate: d.clicks>0 ? ((d.conversions/d.clicks)*100).toFixed(1) : 0, revenue: d.revenue })).sort((a,b)=>b.conversions - a.conversions);
                const sourcesBody = document.getElementById('sourcesBody');
                if(sources.length) {
                    sourcesBody.innerHTML = sources.map(s => `<tr><td><span class="source-badge">${s.source}</span></td><td>${s.clicks}</td><td>${s.conversions}</td><td>${s.convRate}%</td><td>$${s.revenue.toFixed(2)}</td></tr>`).join('');
                    
                    const pieCtx = document.getElementById('clicksPieChart')?.getContext('2d');
                    if(pieCtx && sources.length) {
                        if(clicksPieChart) clicksPieChart.destroy();
                        clicksPieChart = new Chart(pieCtx, { type: 'pie', data: { labels: sources.map(s => s.source), datasets: [{ data: sources.map(s => s.clicks), backgroundColor: ['#3498db','#e74c3c','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#34495e'] }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'right', labels: { font: { size: 10 } } } } } });
                    }
                    const convCtx = document.getElementById('conversionsPieChart')?.getContext('2d');
                    if(convCtx && sources.length) {
                        if(conversionsPieChart) conversionsPieChart.destroy();
                        conversionsPieChart = new Chart(convCtx, { type: 'pie', data: { labels: sources.map(s => s.source), datasets: [{ data: sources.map(s => s.conversions), backgroundColor: ['#3498db','#e74c3c','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#34495e'] }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'right', labels: { font: { size: 10 } } } } } });
                    }
                } else {
                    sourcesBody.innerHTML = '<tr><td colspan="5" class="text-center placeholder-text">No click data available yet.</td></tr>';
                    if(clicksPieChart) clicksPieChart.destroy();
                    if(conversionsPieChart) conversionsPieChart.destroy();
                }
                
                if(clicksChart) { clicksChart.data.datasets[0].data = [Math.max(0,totalClicks-convertedClicks), convertedClicks]; clicksChart.update(); document.getElementById('clicksChartMessage').style.display = totalClicks===0?'block':'none'; }
                if(earningsChart) { earningsChart.data.datasets[0].data = [paidEarn, pendingEarn]; earningsChart.update(); document.getElementById('earningsChartMessage').style.display = (paidEarn+pendingEarn)===0?'block':'none'; }
                
                try {
                    const lbResp = await fetch(`${SUPABASE_URL}/rest/v1/affiliate_leaderboard?select=rank_position,affiliate_code`, { headers: getAuthHeaders() });
                    if(lbResp.ok) { const ranks = await lbResp.json(); let myPos = ranks.findIndex(r => r.affiliate_code === affiliateCode) + 1; document.getElementById('yourRankNumber').innerHTML = myPos > 0 ? myPos : '--'; }
                    else document.getElementById('yourRankNumber').innerHTML = '--';
                } catch(e) { document.getElementById('yourRankNumber').innerHTML = '--'; }
            } catch(e) { console.error('Update error:', e); }
        }

        async function checkAuth() {
            const sessionData = localStorage.getItem('supabase_session');
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            
            console.log('Checking auth - isLoggedIn:', isLoggedIn);
            console.log('sessionData exists:', !!sessionData);
            
            if (!isLoggedIn || !sessionData) { 
                console.log('Not logged in, redirecting to login');
                window.location.href = 'login.html?redirect=affiliates.html'; 
                return false; 
            }
            
            try {
                const session = JSON.parse(sessionData);
                currentSellerId = session.user?.id;
                console.log('Current user ID from session:', currentSellerId);
                
                if (!currentSellerId) return false;
                
                document.querySelector('.account-label').textContent = `Hello, ${session.user?.email?.split('@')[0] || 'Affiliate'}`;
                
                // Check if user has an ACTIVE subscription (NO sellers table check needed)
                const hasActiveSubscription = await isUserActiveSubscribedSeller(currentSellerId);
                console.log('Has active subscription:', hasActiveSubscription);
                
                if (!hasActiveSubscription) {
                    showSubscriptionRequired();
                    return false;
                }
                
                return true;
                
            } catch(e) {
                console.error('Auth error:', e);
                window.location.href = 'login.html?redirect=affiliates.html';
                return false;
            }
        }

        function renderDashboardHTML() {
            const mainContent = document.getElementById('mainContent');
            if (!mainContent) return;
            
            mainContent.innerHTML = `
                <div id="inactiveWarning" class="inactive-warning" style="display: none;">
                    <strong>Stay Active!</strong> You haven't had any referral activity in over 40 days. Share your link to keep earning!
                </div>

                <div class="stats-grid">
                    <div class="stats-card"><div class="stats-number" id="totalClicks">0</div><div>Total Clicks</div><small>on your referral links</small></div>
                    <div class="stats-card"><div class="stats-number" id="totalReferrals">0</div><div>Total Referrals</div><small>successful signups</small></div>
                    <div class="stats-card"><div class="stats-number" id="totalEarnings">$0.00</div><div>Total Earnings</div><small>lifetime commission</small></div>
                    <div class="stats-card"><div class="stats-number" id="unpaidEarnings">$0.00</div><div>Unpaid Earnings</div><small>ready for payout</small></div>
                </div>

                <div class="bg-white rounded-xl p-30 mb-30">
                    <h2 class="mb-20">Your Leaderboard Position</h2>
                    <div class="your-rank-card">
                        <div style="font-size: 18px; opacity: 0.9;">Your Global Rank</div>
                        <div class="your-rank-number" id="yourRankNumber">--</div>
                        <div style="display: flex; justify-content: center; gap: 30px; flex-wrap: wrap; margin-top: 20px;">
                            <div><div style="font-size: 12px; opacity: 0.8;">Your Code</div><div style="font-size: 18px; font-weight: 600;" id="yourCode">Loading...</div></div>
                            <div><div style="font-size: 12px; opacity: 0.8;">Your Tier</div><div style="font-size: 18px; font-weight: 600;" id="yourTier">Bronze</div></div>
                            <div><div style="font-size: 12px; opacity: 0.8;">Total Referrals</div><div style="font-size: 18px; font-weight: 600;" id="yourReferrals">0</div></div>
                            <div><div style="font-size: 12px; opacity: 0.8;">Total Earnings</div><div style="font-size: 18px; font-weight: 600;" id="yourEarnings">$0.00</div></div>
                            <div><div style="font-size: 12px; opacity: 0.8;">30-Day Clicks</div><div style="font-size: 18px; font-weight: 600;" id="yourClicks30d">0</div></div>
                        </div>
                    </div>
                    <p class="mt-20" style="color: #666; font-size: 13px; text-align: center;">Your rank is based on total number of successful referrals. Higher rank = better commission rates!</p>
                </div>

                <div class="bg-white rounded-xl p-30 mb-30">
                    <h2 class="mb-20">Affiliate Tiers &amp; Requirements</h2>
                    <div class="grid-3">
                        <div class="tier-card" id="bronzeCard"><div style="display:flex; justify-content:space-between;"><strong>Bronze</strong><span class="badge-bronze">20%</span></div><div style="font-size:14px;">100-500 referrals</div><div>Progress: <span id="bronzeProgress">0</span>/500</div></div>
                        <div class="tier-card" id="silverCard"><div style="display:flex; justify-content:space-between;"><strong>Silver</strong><span class="badge-silver">25%</span></div><div style="font-size:14px;">501-1000 referrals</div><div>Progress: <span id="silverProgress">0</span>/500</div></div>
                        <div class="tier-card" id="goldCard"><div style="display:flex; justify-content:space-between;"><strong>Gold</strong><span class="badge-gold">30%</span></div><div style="font-size:14px;">1000+ referrals</div><div>Progress: <span id="goldProgress">0</span>+</div></div>
                    </div>
                </div>

                <div class="bg-white rounded-xl p-30 mb-30">
                    <h2 class="mb-20">Your Referral Link</h2>
                    <div class="referral-link-box">
                        <input type="text" id="referralLink" class="referral-link-input" readonly>
                        <button class="btn-primary" onclick="copyReferralLink()">Copy Link</button>
                    </div>
                    <p class="mt-20" style="color: #666; font-size: 13px;">Share this link with potential sellers. When they sign up and subscribe to a paid plan, you earn commission!</p>
                </div>

                <div class="bg-white rounded-xl p-30 mb-30">
                    <h2 class="mb-20">Platform-Specific Referral Links</h2>
                    <p style="color:#666; font-size:13px; margin-bottom:15px;">Use different links to track which platform drives the most sales!</p>
                    <div class="social-links-grid" id="socialLinksContainer"></div>
                </div>

                <div class="charts-row">
                    <div class="bg-white rounded-xl p-30"><h3 class="mb-20 text-center">Clicks vs Conversions</h3><div class="chart-container"><canvas id="clicksChart"></canvas></div><div class="empty-chart-message" id="clicksChartMessage">No data yet</div></div>
                    <div class="bg-white rounded-xl p-30"><h3 class="mb-20 text-center">Earnings Breakdown</h3><div class="chart-container"><canvas id="earningsChart"></canvas></div><div class="empty-chart-message" id="earningsChartMessage">No data yet</div></div>
                </div>

                <div class="bg-white rounded-xl p-30 mb-30">
                    <h2 class="mb-20">Referral Statistics</h2>
                    <div class="grid-3">
                        <div class="stats-card"><div class="stats-number" id="totalReferredCount">0</div><div>Total Referred</div><small>sellers who signed up</small></div>
                        <div class="stats-card"><div class="stats-number" id="activeSubscribers">0</div><div>Active Subscribers</div><small>currently on paid plan</small></div>
                        <div class="stats-card"><div class="stats-number" id="churnedCount">0</div><div>Churned Subscribers</div><small>canceled or expired</small></div>
                    </div>
                </div>

                <div class="bg-white rounded-xl p-30 mb-30">
                    <h2 class="mb-20">Best Performing Sources</h2>
                    <p style="color:#666; margin-bottom:15px; font-size:13px;">Where your clicks and conversions are coming from</p>
                    <div style="overflow-x: auto;">
                        <table class="leaderboard-table">
                            <thead><tr><th>Source</th><th>Clicks</th><th>Conversions</th><th>Conversion Rate</th><th>Revenue</th></tr></thead>
                            <tbody id="sourcesBody"><tr><td colspan="5" class="text-center placeholder-text">No click data available yet.</td></tr></tbody>
                        </table>
                    </div>
                    <div class="pie-chart-row">
                        <div class="pie-chart-box"><h4>Clicks by Source</h4><div class="pie-container"><canvas id="clicksPieChart"></canvas></div></div>
                        <div class="pie-chart-box"><h4>Conversions by Source</h4><div class="pie-container"><canvas id="conversionsPieChart"></canvas></div></div>
                    </div>
                </div>

                <div class="bg-white rounded-xl p-30 mb-30">
                    <h2 class="mb-20">Recent Referral Activity</h2>
                    <div style="overflow-x: auto;"><table class="leaderboard-table"><thead><tr><th>Date</th><th>Plan</th><th>Commission Earned</th><th>Status</th></tr></thead><tbody id="recentReferrals"><tr><td colspan="4" class="text-center placeholder-text">No referral activity yet</td></tr></tbody></table></div>
                </div>
                
                <div class="bg-white rounded-xl p-30 mb-30">
                    <h2 class="mb-20">Payout Information</h2>
                    <p style="color:#666; margin-bottom:15px;">Payouts processed on the 5th of every month via PayNow. Minimum $10.</p>
                    <div class="grid-3">
                        <div class="stats-card"><div class="stats-number" id="pendingPayout">$0.00</div><div>Pending Payout</div></div>
                        <div class="stats-card"><div class="stats-number" id="nextPayoutDate">-</div><div>Next Payout Date</div></div>
                        <div class="stats-card"><div class="stats-number" id="totalPaid">$0.00</div><div>Total Paid</div></div>
                    </div>
                </div>
            `;
        }

        let currentStep = 0, totalSteps = 4;
        function updateTourSteps() { 
            for(let i=0;i<totalSteps;i++) { 
                const el = document.getElementById(`tourStep${i+1}`); 
                if(el) i===currentStep ? el.classList.add('active') : el.classList.remove('active'); 
            } 
            document.querySelectorAll('.tour-dot').forEach((d,idx)=>{ idx===currentStep ? d.classList.add('active') : d.classList.remove('active'); }); 
            const nb = document.getElementById('tourNextBtn'); 
            if(currentStep === totalSteps-1) { nb.textContent='Finish'; nb.classList.add('tour-btn-finish'); nb.classList.remove('tour-btn-next'); } 
            else { nb.textContent='Next'; nb.classList.remove('tour-btn-finish'); nb.classList.add('tour-btn-next'); } 
        }
        
        function nextTourStep() { if(currentStep < totalSteps-1) { currentStep++; updateTourSteps(); } else closeTour(); }
        function closeTour() { document.getElementById('tourOverlay').style.display='none'; localStorage.setItem('affiliate_tour_shown','true'); }
        function skipTour() { closeTour(); }
        function showWelcomeTour() { if(!localStorage.getItem('affiliate_tour_shown')) { document.getElementById('tourOverlay').style.display='flex'; currentStep=0; updateTourSteps(); } }

        async function init() {
            const loading = document.getElementById('loadingOverlay');
            const isAuthed = await checkAuth();
            if (!isAuthed) {
                if (loading) loading.style.display = 'none';
                return;
            }
            
            renderDashboardHTML();
            
            await ensureAffiliateRecord();
            if (!currentAffiliateId) { 
                if (loading) loading.style.display = 'none'; 
                return; 
            }
            
            initEmptyCharts();
            await updateDashboard();
            showWelcomeTour();
            
            if (loading) loading.style.display = 'none';
            setInterval(() => updateDashboard(), 30000);
        }
        
        document.getElementById('tourNextBtn')?.addEventListener('click', nextTourStep);
        document.getElementById('tourSkipBtn')?.addEventListener('click', skipTour);
        document.querySelectorAll('.tour-dot').forEach((dot,idx) => dot.addEventListener('click', () => { currentStep = idx; updateTourSteps(); }));
        
        init();
