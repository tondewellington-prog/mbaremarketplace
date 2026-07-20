// =====================================================
// CONFIGURATION
// =====================================================
window.SUPABASE_URL = 'https://fnncerdxfhwlrdopswpx.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_qjN17tdmLu5yvp9iIUBEjg_ZDZCWMhK';

// =====================================================
// TOUR SYSTEM - For logged-in users only
// =====================================================
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
    if (index === totalTourSteps - 1) {
        nextBtn.textContent = 'Finish';
        nextBtn.className = 'tour-btn tour-btn-finish';
    } else {
        nextBtn.textContent = 'Next';
        nextBtn.className = 'tour-btn tour-btn-next';
    }
}

function startTour() {
    const overlay = document.getElementById('tourOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        currentTourStep = 0;
        showTourStep(0);
    }
}

function endTour() {
    const overlay = document.getElementById('tourOverlay');
    if (overlay) overlay.style.display = 'none';
    localStorage.setItem('mbare_tour_seen', 'true');
}

// =====================================================
// CHECK USER LOGIN STATUS AND SHOW APPROPRIATE CONTENT
// =====================================================
function checkUserAndShowTour() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const sessionData = localStorage.getItem('supabase_session');
    const welcomeBanner = document.getElementById('welcomeBanner');
    
    if (isLoggedIn && sessionData) {
        // User is logged in
        if (welcomeBanner) welcomeBanner.style.display = 'none';
        
        // Check if tour has been seen before
        const tourSeen = localStorage.getItem('mbare_tour_seen') === 'true';
        const userEmail = getLoggedInUserEmail();
        
        // Show tour for new users (first visit after login)
        if (!tourSeen) {
            setTimeout(startTour, 1500);
        }
        
        // Update account menu
        updateAccountMenu(userEmail);
        
    } else {
        // User is NOT logged in - show welcome banner
        if (welcomeBanner) welcomeBanner.style.display = 'block';
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
        accountLabel.textContent = `Hello, ${name}`;
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
// DOM CONTENT LOADED - Initialize everything
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
    // Check login status and show appropriate content
    checkUserAndShowTour();
    
    // Setup tour event listeners
    setupTourEventListeners();
    
    // Update basket count
    updateBasketCount();
    
    // Setup search
    setupSearch();
    
    // Setup category dropdown
    setupCategoryDropdown();
    
    // Setup carousel
    setupCarousel();
    
    // Setup login prompt
    setupLoginPrompt();
    
    // Update account menu for logged in users
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
        const email = getLoggedInUserEmail();
        updateAccountMenu(email);
    }
});

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
        window.location.href = `search.html?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`;
    }
};

// =====================================================
// CATEGORY DROPDOWN
// =====================================================
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

// =====================================================
// CAROUSEL FUNCTIONS
// =====================================================
let currentSlide = 0;
let carouselInterval = null;

function setupCarousel() {
    const totalSlides = document.querySelectorAll('.carousel-slide').length;
    if (totalSlides === 0) return;
    
    // Start auto-advance
    carouselInterval = setInterval(() => moveCarousel(1), 5000);
    
    // Pause on hover
    const container = document.querySelector('.carousel-container');
    if (container) {
        container.addEventListener('mouseenter', () => {
            clearInterval(carouselInterval);
        });
        container.addEventListener('mouseleave', () => {
            carouselInterval = setInterval(() => moveCarousel(1), 5000);
        });
    }
}

window.moveCarousel = function(direction) {
    const totalSlides = document.querySelectorAll('.carousel-slide').length;
    if (totalSlides === 0) return;
    
    currentSlide = (currentSlide + direction + totalSlides) % totalSlides;
    goToSlide(currentSlide);
};

window.goToSlide = function(index) {
    currentSlide = index;
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.indicator');
    
    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });
    indicators.forEach((indicator, i) => {
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
    window.location.href = `product-detail.html?id=${productId}`;
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
        
        await fetch(`${SUPABASE_URL}/rest/v1/app_downloads`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'apikey': SUPABASE_ANON_KEY, 
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}` 
            },
            body: JSON.stringify(downloadData)
        });
    } catch(e) { 
        console.error('Track error:', e); 
    }
}

// PWA Install Tracking Events
window.addEventListener('appinstalled', () => { 
    recordAppDownload('pwa_install'); 
});

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

// =====================================================
// INSTALL BUTTON HANDLING
// =====================================================
let deferredPrompt;
const installButton = document.getElementById('installButton');
const iosPrompt = document.getElementById('iosPromptModal');

const isMobile = /iPhone|iPad|iPod|Android|Mobile|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isAndroid = /Android/i.test(navigator.userAgent);

let isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const wasInstalled = localStorage.getItem('pwa_installed') === 'true';

if (isStandalone || wasInstalled) {
    if (installButton) installButton.style.display = 'none';
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!isStandalone && !wasInstalled && installButton) {
        installButton.style.display = 'flex';
    }
});

if (isMobile && !isStandalone && !wasInstalled && installButton) {
    installButton.style.display = 'flex';
}

if (installButton) {
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
        } else if (isIOS && iosPrompt) {
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
}

window.addEventListener('appinstalled', () => {
    localStorage.setItem('pwa_installed', 'true');
    if (installButton) installButton.style.display = 'none';
    recordAppDownload('pwa_install_complete');
});

window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
    if (e.matches) {
        localStorage.setItem('pwa_installed', 'true');
        if (installButton) installButton.style.display = 'none';
    }
});

window.closeIOSPrompt = function() {
    if (iosPrompt) iosPrompt.style.display = 'none';
};

window.addEventListener('click', function(e) {
    if (e.target === iosPrompt) {
        closeIOSPrompt();
    }
});

// =====================================================
// SERVICE WORKER
// =====================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
            .then(registration => {
                console.log('Service Worker registered');
                setInterval(() => registration.update(), 60000);
            })
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}
// Make functions globally accessible
window.startTour = startTour;
window.endTour = endTour;
window.showTourStep = showTourStep;
window.checkUserAndShowTour = checkUserAndShowTour;
