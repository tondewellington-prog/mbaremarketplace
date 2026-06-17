window.SUPABASE_URL = 'https://fnncerdxfhwlrdopswpx.supabase.co';
        window.SUPABASE_ANON_KEY = 'sb_publishable_qjN17tdmLu5yvp9iIUBEjg_ZDZCWMhK';
        
        window.trackInstallClick = function(source) { recordAppDownload('install_click', { source: source }); };
        
        async function recordAppDownload(downloadType, details) {
            try {
                const SUPABASE_URL = window.SUPABASE_URL;
                const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
                if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
                const userAgent = navigator.userAgent;
                let deviceType = /mobile|android|iphone|ipad|ipod/i.test(userAgent) ? 'mobile' : 'desktop';
                let os = 'unknown';
                if (userAgent.indexOf('Win') !== -1) os = 'windows';
                else if (userAgent.indexOf('Mac') !== -1) os = 'macos';
                else if (userAgent.indexOf('Android') !== -1) os = 'android';
                else if (userAgent.indexOf('like Mac') !== -1) os = 'ios';
                let userId = null;
                const sessionData = localStorage.getItem('supabase_session');
                if (sessionData) {
                    try { userId = JSON.parse(sessionData).user?.id; } catch(e) {}
                }
                const downloadData = {
                    download_type: downloadType,
                    device_type: deviceType,
                    os: os,
                    user_agent: userAgent.substring(0, 255),
                    user_id: userId,
                    timestamp: new Date().toISOString()
                };
                await fetch(`${SUPABASE_URL}/rest/v1/app_downloads`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
                    body: JSON.stringify(downloadData)
                });
            } catch(e) { console.error('Track error:', e); }
        }

        window.addEventListener('appinstalled', () => { recordAppDownload('pwa_install'); });
        
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            if (!localStorage.getItem('app_install_tracked')) {
                recordAppDownload('pwa_install');
                localStorage.setItem('app_install_tracked', 'true');
            }
        }
        
        let promptCount = 0;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            promptCount++;
            if (promptCount === 1) recordAppDownload('install_prompt_shown');
        });
        
        if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream && !window.navigator.standalone) {
            setTimeout(() => { recordAppDownload('ios_add_to_homescreen_prompt'); }, 10000);
        }
        
        document.addEventListener('click', function(e) {
            if (e.target.closest('#installButton')) {
                recordAppDownload('install_click', { method: 'click_event' });
            }
        });
        
        let deferredPrompt;
        const installButton = document.getElementById('installButton');
        const iosPrompt = document.getElementById('iosPromptModal');

        const isMobile = /iPhone|iPad|iPod|Android|Mobile|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isAndroid = /Android/i.test(navigator.userAgent);
        
        let isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        const wasInstalled = localStorage.getItem('pwa_installed') === 'true';
        
        if (isStandalone || wasInstalled) {
            installButton.style.display = 'none';
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            if (!isStandalone && !wasInstalled) {
                installButton.style.display = 'flex';
            }
        });

        if (isMobile && !isStandalone && !wasInstalled) {
            installButton.style.display = 'flex';
        }

        installButton.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    recordAppDownload('install_accepted');
                    localStorage.setItem('pwa_installed', 'true');
                    installButton.style.display = 'none';
                } else {
                    recordAppDownload('install_dismissed');
                }
                deferredPrompt = null;
            } else if (isIOS) {
                iosPrompt.style.display = 'block';
                recordAppDownload('ios_install_modal_shown');
            } else if (isAndroid) {
                alert('To install the app:\n\n1. Tap the three dots ⋮ in the top right\n2. Tap "Install app"\n3. Tap "Install"');
                recordAppDownload('android_manual_install');
            } else {
                alert('To install the app:\n\n1. Click the install icon in the address bar\n2. Click "Install"\n\nOr look for "Install app" in the browser menu');
                recordAppDownload('install_fallback');
            }
        });

        window.addEventListener('appinstalled', () => {
            localStorage.setItem('pwa_installed', 'true');
            installButton.style.display = 'none';
            recordAppDownload('pwa_install_complete');
        });

        window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
            if (e.matches) {
                localStorage.setItem('pwa_installed', 'true');
                installButton.style.display = 'none';
            }
        });

        window.closeIOSPrompt = function() {
            iosPrompt.style.display = 'none';
        };

        window.addEventListener('click', function(e) {
            if (e.target === iosPrompt) {
                closeIOSPrompt();
            }
        });

        function showLoginPrompt() {
            document.getElementById('loginPromptModal').style.display = 'flex';
        }
        
        function hideLoginPrompt() {
            document.getElementById('loginPromptModal').style.display = 'none';
        }
        
        function checkLoginAndNavigate(productId) {
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            if (!isLoggedIn) {
                showLoginPrompt();
                return false;
            }
            window.location.href = `product-detail.html?id=${productId}`;
            return true;
        }

        window.goToProductDetail = function(productId) {
            checkLoginAndNavigate(productId);
        };

        window.logout = function() {
            if (window.uiCommon) {
                window.uiCommon.logoutToHome(true);
            } else if (window.api && window.api.logout) {
                window.api.logout();
            } else {
                localStorage.removeItem('supabase_session');
                localStorage.removeItem('isLoggedIn');
                window.location.href = 'index.html';
            }
        };

        document.addEventListener('DOMContentLoaded', function() {
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            const logoutBtn = document.getElementById('logoutBtn');
            const accountMenu = document.getElementById('accountMenu');
            
            if (isLoggedIn && logoutBtn) {
                logoutBtn.style.display = 'inline-block';
                accountMenu.classList.add('logged-in');
                
                const sessionData = localStorage.getItem('supabase_session');
                if (sessionData) {
                    try {
                        const session = JSON.parse(sessionData);
                        const userEmail = session.user?.email || 'User';
                        const accountLabel = document.querySelector('.account-label');
                        const accountLink = document.querySelector('.account-link');
                        if (accountLabel) {
                            accountLabel.textContent = `Hello, ${userEmail.split('@')[0]}`;
                            accountLabel.style.color = '#232f3e';
                        }
                        if (accountLink) {
                            accountLink.textContent = 'Your Account';
                            accountLink.style.color = '#232f3e';
                        }
                    } catch (e) {}
                }
            }
        });
