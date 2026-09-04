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
        document.querySelectorAll('.tour-step').forEach(el => el.classList.remove('active'));
        const stepEl = document.getElementById(tourSteps[index]);
        if (stepEl) stepEl.classList.add('active');
        
        document.querySelectorAll('.tour-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        
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
    // CHECK USER LOGIN STATUS
    // =====================================================
    function checkUserAndShowTour() {
        console.log('Checking user status...');
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const sessionData = localStorage.getItem('supabase_session');
        const welcomeBanner = document.getElementById('welcomeBanner');
        
        console.log('isLoggedIn:', isLoggedIn);
        console.log('has session:', !!sessionData);
        
        if (isLoggedIn && sessionData) {
            if (welcomeBanner) welcomeBanner.style.display = 'none';
            const tourSeen = localStorage.getItem('mbare_tour_seen') === 'true';
            const userEmail = getLoggedInUserEmail();
            console.log('Tour seen before:', tourSeen);
            if (!tourSeen) {
                console.log('New user detected - starting tour in 1.5 seconds');
                setTimeout(startTour, 1500);
            } else {
                console.log('Returning user - tour already seen');
            }
            updateAccountMenu(userEmail);
        } else {
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
    // SEARCH OVERLAY FUNCTIONS (with search-results.html)
    // =====================================================
    window.openSearchOverlay = function() {
        var overlay = document.getElementById('searchOverlay');
        if (overlay) {
            overlay.classList.add('active');
            var input = document.getElementById('overlaySearchInput');
            if (input) setTimeout(function() { input.focus(); }, 100);
        }
    };

    window.closeSearchOverlay = function() {
        var overlay = document.getElementById('searchOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    };

    window.handleOverlaySearch = function() {
        var input = document.getElementById('overlaySearchInput');
        var category = document.getElementById('overlayCategorySelect');
        if (!input) return;
        var query = input.value.trim();
        if (query) {
            var cat = category ? category.value : 'All';
            window.location.href = 'search-results.html?q=' + encodeURIComponent(query) + '&category=' + encodeURIComponent(cat);
        }
    };

    // Close overlay on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            window.closeSearchOverlay();
        }
    });

    // Close overlay when clicking on the backdrop
    document.addEventListener('click', function(e) {
        var overlay = document.getElementById('searchOverlay');
        if (overlay && e.target === overlay) {
            window.closeSearchOverlay();
        }
    });

    // Enter key in overlay input triggers search
    var overlayInput = document.getElementById('overlaySearchInput');
    if (overlayInput) {
        overlayInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                window.handleOverlaySearch();
            }
        });
    }

    // =====================================================
    // SEARCH HANDLER (for header input, opens overlay)
    // =====================================================
    function setupSearch() {
        var searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    window.openSearchOverlay();
                }
            });
        }
    }

    // Keep the old handleSearch for fallback (uses search-results.html)
    window.handleSearch = function() {
        var searchInput = document.getElementById('searchInput');
        var categorySelect = document.getElementById('searchCategorySelect');
        if (!searchInput) return;
        var query = searchInput.value.trim();
        if (query) {
            var category = categorySelect?.value || 'All';
            window.location.href = 'search-results.html?q=' + encodeURIComponent(query) + '&category=' + encodeURIComponent(category);
        }
    };

    // =====================================================
    // CAROUSEL – FIXED (width + transform)
    // =====================================================
    let tourCarouselSlide = 0;
    let tourCarouselInterval = null;

    function setupCarousel() {
        var totalSlides = document.querySelectorAll('.carousel-slide').length;
        if (totalSlides === 0) return;

        var slidesContainer = document.querySelector('.carousel-slides');
        if (slidesContainer) {
            slidesContainer.style.width = (totalSlides * 100) + '%';
            goToSlide(0);
        }

        // Start auto-advance
        if (tourCarouselInterval) clearInterval(tourCarouselInterval);
        tourCarouselInterval = setInterval(function() { moveCarousel(1); }, 5000);

        var container = document.querySelector('.carousel-container');
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
        var totalSlides = document.querySelectorAll('.carousel-slide').length;
        if (totalSlides === 0) return;
        tourCarouselSlide = (tourCarouselSlide + direction + totalSlides) % totalSlides;
        goToSlide(tourCarouselSlide);
    };

    window.goToSlide = function(index) {
        tourCarouselSlide = index;
        var slidesContainer = document.querySelector('.carousel-slides');
        var slides = document.querySelectorAll('.carousel-slide');
        var indicators = document.querySelectorAll('.indicator');
        var totalSlides = slides.length;

        if (slidesContainer) {
            // Set width if not already set
            if (!slidesContainer.style.width || slidesContainer.style.width === '') {
                slidesContainer.style.width = (totalSlides * 100) + '%';
            }
            slidesContainer.style.transform = 'translateX(-' + (index * 100 / totalSlides) + '%)';
        }

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
    // INSTALL BUTTON HANDLING
    // =====================================================
    let deferredPrompt;
    var installButton = document.getElementById('installButton');
    var iosPrompt = document.getElementById('iosPromptModal');

    var isMobile = /iPhone|iPad|iPod|Android|Mobile|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    var isAndroid = /Android/i.test(navigator.userAgent);

    var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    var wasInstalled = localStorage.getItem('pwa_installed') === 'true';

    if (isStandalone || wasInstalled) {
        if (installButton) installButton.style.display = 'none';
    }

    window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredPrompt = e;
        if (!isStandalone && !wasInstalled && installButton) {
            installButton.style.display = 'flex';
            installButton.innerHTML = '<span class="install-icon">📱</span> Install App';
        }
    });

    if (isMobile && !isStandalone && !wasInstalled && installButton) {
        installButton.style.display = 'flex';
    }

    if (installButton) {
        installButton.addEventListener('click', async function() {
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
            if (isIOS) {
                if (iosPrompt) {
                    iosPrompt.style.display = 'block';
                    recordAppDownload('ios_install_modal_shown');
                }
                return;
            }
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
            alert('To install this app, look for the install icon in your browser address bar.');
            recordAppDownload('install_fallback');
        });
    }

    window.addEventListener('appinstalled', function() {
        localStorage.setItem('pwa_installed', 'true');
        if (installButton) installButton.style.display = 'none';
        recordAppDownload('pwa_install_complete');
        console.log('App installed successfully!');
    });

    window.matchMedia('(display-mode: standalone)').addEventListener('change', function(e) {
        if (e.matches) {
            localStorage.setItem('pwa_installed', 'true');
            if (installButton) installButton.style.display = 'none';
        }
    });

    window.closeIOSPrompt = function() {
        if (iosPrompt) iosPrompt.style.display = 'none';
        localStorage.setItem('iosPromptDismissed', 'true');
    };

    window.addEventListener('click', function(e) {
        if (e.target === iosPrompt) {
            closeIOSPrompt();
        }
    });

    // =====================================================
    // DESKTOP APP DOWNLOADS – FIXED (event parameter added)
    // =====================================================
    function initDesktopDownloads() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isWindows = /windows|win32|win64|wow64/i.test(userAgent);
        const isMac = /macintosh|mac os x|mac_powerpc/i.test(userAgent);
        const isLinux = /linux/i.test(userAgent) && !/android/i.test(userAgent);
        const isDesktop = !/android|webos|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);
        console.log('Desktop Download Check:', { isWindows, isMac, isLinux, isDesktop });
        if (!isDesktop) return;
        const downloadLinks = document.querySelectorAll('.download-link');
        downloadLinks.forEach(el => {
            if (isWindows && el.id === 'downloadWindowsBtn') {
                el.style.display = 'inline-block';
                el.addEventListener('click', function(e) {
                    e.preventDefault();
                    downloadDesktopApp('windows', e);
                });
            } else if (isMac && el.id === 'downloadMacBtn') {
                el.style.display = 'inline-block';
                el.addEventListener('click', function(e) {
                    e.preventDefault();
                    downloadDesktopApp('mac', e);
                });
            } else if (isLinux && el.id === 'downloadLinuxBtn') {
                el.style.display = 'inline-block';
                el.addEventListener('click', function(e) {
                    e.preventDefault();
                    downloadDesktopApp('linux', e);
                });
            } else if (el.id === 'downloadAndroidBtn' || el.id === 'downloadIOSBtn') {
                el.style.display = 'none';
            }
        });
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
    
    // FIXED: accepts event parameter
    window.downloadDesktopApp = function(os, event) {
        const downloadUrls = {
            windows: 'https://www.mbaremarketplace.com/downloads/mbare-marketplace-windows.exe',
            mac: 'https://www.mbaremarketplace.com/downloads/mbare-marketplace-mac.dmg',
            linux: 'https://www.mbaremarketplace.com/downloads/mbare-marketplace-linux.AppImage'
        };
        const url = downloadUrls[os];
        if (url) {
            recordAppDownload('desktop_download', { os: os });
            window.location.href = url;
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
        const androidLink = document.getElementById('downloadAndroidBtn');
        if (androidLink) {
            androidLink.style.display = 'inline-block';
            androidLink.href = 'https://play.google.com/store/apps/details?id=com.mbaremarketplace.app';
            androidLink.addEventListener('click', function(e) {
                recordAppDownload('android_play_store_click');
            });
        }
        const installBtn = document.getElementById('installButton');
        if (installBtn && !window.deferredPrompt) {
            installBtn.addEventListener('click', function() {
                if (!window.deferredPrompt) {
                    window.open('https://play.google.com/store/apps/details?id=com.mbaremarketplace.app', '_blank');
                    recordAppDownload('android_play_store_install');
                }
            });
        }
    }

    // =====================================================
    // DOM CONTENT LOADED – INIT
    // =====================================================
    document.addEventListener('DOMContentLoaded', function() {
        console.log('index-2.js: DOM loaded, initializing...');
        
        checkUserAndShowTour();
        setupTourEventListeners();
        updateBasketCount();
        setupSearch();
        setupCarousel();
        setupLoginPrompt();
        
        var isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (isLoggedIn) {
            var email = getLoggedInUserEmail();
            updateAccountMenu(email);
        }
        
        initDesktopDownloads();
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
