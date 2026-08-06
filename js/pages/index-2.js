// =====================================================
// CONFIGURATION
// =====================================================
window.SUPABASE_URL = 'https://fnncerdxfhwlrdopswpx.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_qjN17tdmLu5yvp9iIUBEjg_ZDZCWMhK';

// =====================================================
// TOUR SYSTEM - For logged-in users only
// =====================================================

(function() {
    'use strict';

    const tourSteps = ['tourStep1', 'tourStep2', 'tourStep3', 'tourStep4', 'tourStep5', 'tourStep6'];
    let currentTourStep = 0;
    const totalTourSteps = tourSteps.length;

    function showTourStep(index) {
        // Hide all steps
        document.querySelectorAll('.tour-step').forEach(el => el.classList.remove('active'));
        // Show current step
        const stepEl = document.getElementById(tourSteps[index]);
        if (stepEl) stepEl.classList.add('active');
        
        // Update dots
        document.querySelectorAll('.tour-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        
        // Update button text
        const nextBtn = document.getElementById('tourNextBtn');
        if (nextBtn) {
            if (index === totalTourSteps - 1) {
                nextBtn.textContent = 'Finish';
                nextBtn.className = 'tour-btn tour-btn-finish';
            } else {
                nextBtn.textContent = 'Next';
                nextBtn.className = 'tour-btn tour-btn-next';
            }
        }
    }

    function startTour() {
        console.log('Starting tour...');
        const overlay = document.getElementById('tourOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
            currentTourStep = 0;
            showTourStep(0);
            console.log('Tour started successfully');
        } else {
            console.error('Tour overlay not found');
        }
    }

    function endTour() {
        console.log('Ending tour...');
        const overlay = document.getElementById('tourOverlay');
        if (overlay) overlay.style.display = 'none';
        localStorage.setItem('mbare_tour_seen', 'true');
    }

    // =====================================================
    // CHECK USER LOGIN STATUS AND SHOW APPROPRIATE CONTENT
    // =====================================================
    function checkUserAndShowTour() {
        console.log('Checking user status...');
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const sessionData = localStorage.getItem('supabase_session');
        const welcomeBanner = document.getElementById('welcomeBanner');
        
        console.log('isLoggedIn:', isLoggedIn);
        console.log('has session:', !!sessionData);
        
        if (isLoggedIn && sessionData) {
            // User is logged in
            if (welcomeBanner) welcomeBanner.style.display = 'none';
            
            // Check if tour has been seen before
            const tourSeen = localStorage.getItem('mbare_tour_seen') === 'true';
            const userEmail = getLoggedInUserEmail();
            
            console.log('Tour seen before:', tourSeen);
            
            // Show tour for new users (first visit after login)
            if (!tourSeen) {
                console.log('New user detected - starting tour in 1.5 seconds');
                setTimeout(startTour, 1500);
            } else {
                console.log('Returning user - tour already seen');
            }
            
            // Update account menu
            updateAccountMenu(userEmail);
            
        } else {
            // User is NOT logged in - show welcome banner
            if (welcomeBanner) welcomeBanner.style.display = 'block';
            console.log('User not logged in - showing welcome banner');
        }
    }

    function getLoggedInUserEmail() {
        try {
            const sessionData = localStorage.getItem('supabase_session');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                return session.user?.email || 'User';
            }
        } catch (e) {}
        return 'User';
    }

    function updateAccountMenu(email) {
        const accountLabel = document.querySelector('.account-label');
        const accountLink = document.querySelector('.account-link');
        const logoutBtn = document.getElementById('logoutBtn');
        const accountMenu = document.getElementById('accountMenu');
        
        if (accountLabel) {
            const name = email.split('@')[0];
            accountLabel.textContent = 'Hello, ' + name;
            accountLabel.style.color = '#232f3e';
        }
        if (accountLink) {
            accountLink.textContent = 'Your Account';
            accountLink.style.color = '#232f3e';
        }
        if (logoutBtn) {
            logoutBtn.style.display = 'inline-block';
        }
        if (accountMenu) {
            accountMenu.classList.add('logged-in');
        }
    }

    // =====================================================
    // TOUR EVENT LISTENERS
    // =====================================================
    function setupTourEventListeners() {
        const nextBtn = document.getElementById('tourNextBtn');
        const skipBtn = document.getElementById('tourSkipBtn');
        
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                if (currentTourStep === totalTourSteps - 1) {
                    endTour();
                } else {
                    currentTourStep++;
                    showTourStep(currentTourStep);
                }
            });
        }
        
        if (skipBtn) {
            skipBtn.addEventListener('click', endTour);
        }
        
        // Click dots to navigate
        document.querySelectorAll('.tour-dot').forEach((dot) => {
            dot.addEventListener('click', function() {
                const step = parseInt(this.dataset.step);
                currentTourStep = step;
                showTourStep(step);
            });
        });
    }

    // =====================================================
    // BASKET COUNT
    // =====================================================
    function updateBasketCount() {
        const basketCount = document.getElementById('basketCount');
        if (basketCount) {
            try {
                const basket = JSON.parse(localStorage.getItem('basket') || '[]');
                basketCount.textContent = basket.length;
            } catch (e) {
                basketCount.textContent = '0';
            }
        }
    }

    // =====================================================
    // SEARCH HANDLER
    // =====================================================
    function setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.querySelector('.search-btn');
        
        if (searchInput) {
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                }
            });
        }
        
        if (searchBtn) {
            searchBtn.addEventListener('click', handleSearch);
        }
    }

    window.handleSearch = function() {
        const searchInput = document.getElementById('searchInput');
        const categorySelect = document.getElementById('searchCategorySelect');
        
        if (!searchInput) return;
        
        const query = searchInput.value.trim();
        if (query) {
            const category = categorySelect?.value || 'All';
            window.location.href = 'search.html?q=' + encodeURIComponent(query) + '&category=' + encodeURIComponent(category);
        }
    };

    // =====================================================
    // CATEGORY DROPDOWN - DISABLED (handled by index-1.js)
    // =====================================================
    /*
    function setupCategoryDropdown() {
        const dropdownBtn = document.getElementById('categoryDropdownBtn');
        const dropdownMenu = document.getElementById('categoryDropdownMenu');
        
        if (dropdownBtn && dropdownMenu) {
            dropdownBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const expanded = this.getAttribute('aria-expanded') === 'true';
                this.setAttribute('aria-expanded', !expanded);
                dropdownMenu.classList.toggle('show');
            });
            
            document.addEventListener('click', function(e) {
                if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
                    dropdownBtn.setAttribute('aria-expanded', 'false');
                    dropdownMenu.classList.remove('show');
                }
            });
            
            document.querySelectorAll('.dropdown-category-item').forEach(item => {
                item.addEventListener('click', function() {
                    dropdownBtn.setAttribute('aria-expanded', 'false');
                    dropdownMenu.classList.remove('show');
                });
            });
        }
    }
    */

    // =====================================================
    // CAROUSEL FUNCTIONS - Use unique variable name to avoid conflicts
    // =====================================================
    let tourCarouselSlide = 0;
    let tourCarouselInterval = null;

    function setupCarousel() {
        const totalSlides = document.querySelectorAll('.carousel-slide').length;
        if (totalSlides === 0) return;
        
        // Start auto-advance
        tourCarouselInterval = setInterval(function() { moveCarousel(1); }, 5000);
        
        // Pause on hover
        const container = document.querySelector('.carousel-container');
        if (container) {
            container.addEventListener('mouseenter', function() {
                clearInterval(tourCarouselInterval);
            });
            container.addEventListener('mouseleave', function() {
                tourCarouselInterval = setInterval(function() { moveCarousel(1); }, 5000);
            });
        }
    }

    window.moveCarousel = function(direction) {
        const totalSlides = document.querySelectorAll('.carousel-slide').length;
        if (totalSlides === 0) return;
        
        tourCarouselSlide = (tourCarouselSlide + direction + totalSlides) % totalSlides;
        goToSlide(tourCarouselSlide);
    };

    window.goToSlide = function(index) {
        tourCarouselSlide = index;
        const slides = document.querySelectorAll('.carousel-slide');
        const indicators = document.querySelectorAll('.indicator');
        
        slides.forEach(function(slide, i) {
            slide.classList.toggle('active', i === index);
        });
        indicators.forEach(function(indicator, i) {
            indicator.classList.toggle('active', i === index);
        });
    };

    // =====================================================
    // LOGIN PROMPT
    // =====================================================
    function setupLoginPrompt() {
        const loginPromptModal = document.getElementById('loginPromptModal');
        if (!loginPromptModal) return;
        
        // Click on product cards
        document.addEventListener('click', function(e) {
            const productCard = e.target.closest('.product-card');
            if (productCard) {
                e.preventDefault();
                let productId = null;
                const onclick = productCard.getAttribute('onclick');
                if (onclick) {
                    const match = onclick.match(/id=(\d+)/);
                    if (match) productId = match[1];
                }
                if (productId) checkLoginAndNavigate(productId);
            }
        });
    }

    window.showLoginPrompt = function() {
        const modal = document.getElementById('loginPromptModal');
        if (modal) modal.style.display = 'flex';
    };

    window.hideLoginPrompt = function() {
        const modal = document.getElementById('loginPromptModal');
        if (modal) modal.style.display = 'none';
    };

    window.checkLoginAndNavigate = function(productId) {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (!isLoggedIn) {
            showLoginPrompt();
            return false;
        }
        window.location.href = 'product-detail.html?id=' + productId;
        return true;
    };

    window.goToProductDetail = function(productId) {
        checkLoginAndNavigate(productId);
    };

    // =====================================================
    // LOGOUT
    // =====================================================
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

    // =====================================================
    // APP INSTALL TRACKING
    // =====================================================
    window.trackInstallClick = function(source) { 
        recordAppDownload('install_click', { source: source }); 
    };

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
            
            await fetch(SUPABASE_URL + '/rest/v1/app_downloads', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'apikey': SUPABASE_ANON_KEY, 
                    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY 
                },
                body: JSON.stringify(downloadData)
            });
        } catch(e) { 
            console.error('Track error:', e); 
        }
    }

    // PWA Install Tracking Events
    window.addEventListener('appinstalled', function() { 
        recordAppDownload('pwa_install'); 
    });

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        if (!localStorage.getItem('app_install_tracked')) {
            recordAppDownload('pwa_install');
            localStorage.setItem('app_install_tracked', 'true');
        }
    }

    let promptCount = 0;
    window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        promptCount++;
        if (promptCount === 1) recordAppDownload('install_prompt_shown');
    });

    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream && !window.navigator.standalone) {
        setTimeout(function() { recordAppDownload('ios_add_to_homescreen_prompt'); }, 10000);
    }

    document.addEventListener('click', function(e) {
        if (e.target.closest('#installButton')) {
            recordAppDownload('install_click', { method: 'click_event' });
        }
    });

    // =====================================================
    // INSTALL BUTTON HANDLING - UPDATED FOR AUTOMATIC INSTALL
    // =====================================================
    let deferredPrompt;
    var installButton = document.getElementById('installButton');
    var iosPrompt = document.getElementById('iosPromptModal');

    var isMobile = /iPhone|iPad|iPod|Android|Mobile|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    var isAndroid = /Android/i.test(navigator.userAgent);

    var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    var wasInstalled = localStorage.getItem('pwa_installed') === 'true';

    // Hide install button if already installed
    if (isStandalone || wasInstalled) {
        if (installButton) installButton.style.display = 'none';
    }

    // Listen for PWA install prompt
    window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install button on ALL devices that support PWA
        if (!isStandalone && !wasInstalled && installButton) {
            installButton.style.display = 'flex';
            installButton.innerHTML = '<span class="install-icon">📱</span> Install App';
        }
    });

    // Show install button on mobile if not installed
    if (isMobile && !isStandalone && !wasInstalled && installButton) {
        installButton.style.display = 'flex';
    }

    // INSTALL BUTTON CLICK HANDLER - AUTOMATIC FOR ALL DEVICES
    if (installButton) {
        installButton.addEventListener('click', async function() {
            // === ANDROID: Automatic PWA Install ===
            if (isAndroid && deferredPrompt) {
                deferredPrompt.prompt();
                var result = await deferredPrompt.userChoice;
                
                if (result.outcome === 'accepted') {
                    recordAppDownload('install_accepted');
                    localStorage.setItem('pwa_installed', 'true');
                    installButton.style.display = 'none';
                    console.log('Android app installed successfully!');
                } else {
                    recordAppDownload('install_dismissed');
                    console.log('Android installation dismissed');
                }
                deferredPrompt = null;
                return;
            }
            
            // === iOS: Show instructions modal ===
            if (isIOS) {
                if (iosPrompt) {
                    iosPrompt.style.display = 'block';
                    recordAppDownload('ios_install_modal_shown');
                }
                return;
            }
            
            // === Desktop PWA: Automatic Install ===
            if (deferredPrompt) {
                deferredPrompt.prompt();
                var result = await deferredPrompt.userChoice;
                if (result.outcome === 'accepted') {
                    recordAppDownload('install_accepted');
                    localStorage.setItem('pwa_installed', 'true');
                    installButton.style.display = 'none';
                    console.log('Desktop app installed successfully!');
                } else {
                    recordAppDownload('install_dismissed');
                    console.log('Desktop installation dismissed');
                }
                deferredPrompt = null;
                return;
            }
            
            // === Fallback (should rarely happen) ===
            alert('To install this app, look for the install icon in your browser address bar.');
            recordAppDownload('install_fallback');
        });
    }

    // Track when app is installed
    window.addEventListener('appinstalled', function() {
        localStorage.setItem('pwa_installed', 'true');
        if (installButton) installButton.style.display = 'none';
        recordAppDownload('pwa_install_complete');
        console.log('App installed successfully!');
    });

    // Detect standalone mode changes
    window.matchMedia('(display-mode: standalone)').addEventListener('change', function(e) {
        if (e.matches) {
            localStorage.setItem('pwa_installed', 'true');
            if (installButton) installButton.style.display = 'none';
        }
    });

    // Close iOS prompt
    window.closeIOSPrompt = function() {
        if (iosPrompt) iosPrompt.style.display = 'none';
        localStorage.setItem('iosPromptDismissed', 'true');
    };

    // Click outside iOS prompt to close
    window.addEventListener('click', function(e) {
        if (e.target === iosPrompt) {
            closeIOSPrompt();
        }
    });

    // =====================================================
    // SERVICE WORKER
    // =====================================================
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
                .then(function(registration) {
                    console.log('Service Worker registered');
                    setInterval(function() { registration.update(); }, 60000);
                })
                .catch(function(err) { console.log('Service Worker registration failed:', err); });
        });
    }

    // =====================================================
    // DESKTOP APP DOWNLOADS (Native apps for Windows/Mac/Linux)
    // =====================================================
    function initDesktopDownloads() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isWindows = /windows|win32|win64|wow64/i.test(userAgent);
        const isMac = /macintosh|mac os x|mac_powerpc/i.test(userAgent);
        const isLinux = /linux/i.test(userAgent) && !/android/i.test(userAgent);
        const isDesktop = !/android|webos|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);
        
        console.log('Desktop Download Check:', { isWindows, isMac, isLinux, isDesktop });
        
        if (!isDesktop) return; // Only run on desktop
        
        // Show desktop download links
        const downloadLinks = document.querySelectorAll('.download-link');
        downloadLinks.forEach(el => {
            if (isWindows && el.id === 'downloadWindowsBtn') {
                el.style.display = 'inline-block';
                el.addEventListener('click', function(e) {
                    e.preventDefault();
                    downloadDesktopApp('windows');
                });
            } else if (isMac && el.id === 'downloadMacBtn') {
                el.style.display = 'inline-block';
                el.addEventListener('click', function(e) {
                    e.preventDefault();
                    downloadDesktopApp('mac');
                });
            } else if (isLinux && el.id === 'downloadLinuxBtn') {
                el.style.display = 'inline-block';
                el.addEventListener('click', function(e) {
                    e.preventDefault();
                    downloadDesktopApp('linux');
                });
            } else if (el.id === 'downloadAndroidBtn' || el.id === 'downloadIOSBtn') {
                el.style.display = 'none'; // Hide mobile links on desktop
            }
        });
        
        // Show desktop download badge in header
        const badge = document.getElementById('desktopDownloadBadge');
        if (badge) {
            badge.style.display = 'inline-block';
            let osName = 'Desktop';
            if (isWindows) osName = 'Windows';
            else if (isMac) osName = 'macOS';
            else if (isLinux) osName = 'Linux';
            badge.innerHTML = '💻 Download ' + osName + ' App';
        }
    }
    
    // Download function for native desktop apps
    window.downloadDesktopApp = function(os) {
        const downloadUrls = {
            windows: 'https://www.mbaremarketplace.com/downloads/mbare-marketplace-windows.exe',
            mac: 'https://www.mbaremarketplace.com/downloads/mbare-marketplace-mac.dmg',
            linux: 'https://www.mbaremarketplace.com/downloads/mbare-marketplace-linux.AppImage'
        };
        
        const url = downloadUrls[os];
        if (url) {
            // Track download
            recordAppDownload('desktop_download', { os: os });
            
            // Start download
            window.location.href = url;
            
            // Show feedback
            const btn = event && event.target ? event.target.closest('.download-link') : null;
            if (btn) {
                const originalText = btn.innerHTML;
                btn.innerHTML = '⬇️ Downloading...';
                btn.style.opacity = '0.7';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.opacity = '1';
                }, 3000);
            }
        } else {
            alert('Download not available for ' + os + ' yet. Please check back soon!');
        }
    };
    
    // Show desktop download options (scroll to footer)
    window.showDesktopDownloadOptions = function() {
        const downloadSection = document.querySelector('.footer-columns:last-child');
        if (downloadSection) {
            downloadSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            downloadSection.style.transition = 'background 0.3s';
            downloadSection.style.background = 'rgba(255, 255, 255, 0.05)';
            setTimeout(() => {
                downloadSection.style.background = 'transparent';
            }, 1500);
        }
    };

    // =====================================================
    // ANDROID APP STORE LINK
    // =====================================================
    function initAndroidAppLink() {
        const isAndroid = /Android/i.test(navigator.userAgent);
        if (!isAndroid) return;
        
        // Show Android Play Store link in footer
        const androidLink = document.getElementById('downloadAndroidBtn');
        if (androidLink) {
            androidLink.style.display = 'inline-block';
            androidLink.href = 'https://play.google.com/store/apps/details?id=com.mbaremarketplace.app';
            androidLink.addEventListener('click', function(e) {
                recordAppDownload('android_play_store_click');
                // Allow the link to open normally
            });
        }
        
        // Also update the install button for Android
        const installBtn = document.getElementById('installButton');
        if (installBtn && !window.deferredPrompt) {
            installBtn.addEventListener('click', function() {
                // If PWA install isn't available, offer Play Store
                if (!window.deferredPrompt) {
                    window.open('https://play.google.com/store/apps/details?id=com.mbaremarketplace.app', '_blank');
                    recordAppDownload('android_play_store_install');
                }
            });
        }
    }

    // =====================================================
    // DOM CONTENT LOADED - Initialize everything
    // =====================================================
    document.addEventListener('DOMContentLoaded', function() {
        console.log('index-2.js: DOM loaded, initializing...');
        
        // Check login status and show appropriate content
        checkUserAndShowTour();
        
        // Setup tour event listeners
        setupTourEventListeners();
        
        // Update basket count
        updateBasketCount();
        
        // Setup search
        setupSearch();
        
        // Category dropdown is handled by index-1.js - skipping here
        
        // Setup carousel
        setupCarousel();
        
        // Setup login prompt
        setupLoginPrompt();
        
        // Update account menu for logged in users
        var isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (isLoggedIn) {
            var email = getLoggedInUserEmail();
            updateAccountMenu(email);
        }
        
        // Initialize desktop downloads
        initDesktopDownloads();
        
        // Initialize Android app link
        initAndroidAppLink();
        
        console.log('index-2.js: Initialization complete!');
    });

    // =====================================================
    // EXPOSE FUNCTIONS GLOBALLY
    // =====================================================
    window.startTour = startTour;
    window.endTour = endTour;
    window.showTourStep = showTourStep;
    window.checkUserAndShowTour = checkUserAndShowTour;
    window.tourCarouselSlide = tourCarouselSlide;

    console.log('index-2.js: Tour functions exposed globally!');

})();
