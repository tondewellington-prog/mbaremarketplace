// auth-check.js

// ==================== LOGIN PROMPT MODAL ====================
// Inject the login prompt modal into the page
function injectLoginPrompt() {
    // Check if already injected
    if (document.getElementById('loginPromptModal')) return;
    
    const modalHTML = `
        <div id="loginPromptModal" class="login-prompt-overlay" style="display: none;">
            <div class="login-prompt-box">
                <h2>Login Required</h2>
                <p>You need to be logged in to view product details.</p>
                <div class="login-prompt-buttons">
                    <a href="login.html" class="login-prompt-btn login-btn">Login</a>
                    <button class="login-prompt-btn cancel-btn" onclick="hideLoginPrompt()">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    // Add the CSS styles for the modal
    const styleCSS = `
        .login-prompt-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 9999;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .login-prompt-box {
            background: white;
            padding: 40px;
            border-radius: 8px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .login-prompt-box h2 {
            margin-bottom: 15px;
            color: #232f3e;
        }
        .login-prompt-box p {
            margin-bottom: 25px;
            color: #666;
        }
        .login-prompt-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
        }
        .login-prompt-btn {
            padding: 12px 30px;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
        }
        .login-btn {
            background: #f90;
            color: white;
        }
        .cancel-btn {
            background: #f0f0f0;
            color: #666;
        }
    `;
    
    const styleTag = document.createElement('style');
    styleTag.textContent = styleCSS;
    document.head.appendChild(styleTag);
    
    // Inject modal at the start of body
    document.body.insertAdjacentHTML('afterbegin', modalHTML);
}

// Show/hide login prompt
window.showLoginPrompt = function() {
    const modal = document.getElementById('loginPromptModal');
    if (modal) modal.style.display = 'flex';
};

window.hideLoginPrompt = function() {
    const modal = document.getElementById('loginPromptModal');
    if (modal) modal.style.display = 'none';
};

// ==================== CHECK LOGIN STATUS ====================
document.addEventListener('DOMContentLoaded', function() {
    injectLoginPrompt();
    checkLoginStatus();
});

// Also check when page becomes visible (in case user logs in/out in another tab)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        checkLoginStatus();
    }
});

function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const sessionData = localStorage.getItem('supabase_session');
    
    // Find the account menu elements
    const accountLabel = document.querySelector('.account-label');
    const accountLink = document.querySelector('.account-link');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (isLoggedIn && sessionData && accountLabel && accountLink) {
        try {
            const session = JSON.parse(sessionData);
            const userEmail = session.user?.email || 'User';
            const userName = session.user?.user_metadata?.full_name || userEmail.split('@')[0];
            
            // Update UI for logged in user
            accountLabel.textContent = 'Hello,';
            accountLink.textContent = userName;
            accountLink.href = '#';
            
            // Show logout button
            if (logoutBtn) {
                logoutBtn.style.display = 'inline-block';
            }
        } catch (e) {
            // If error, clear storage and show logged out state
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('supabase_session');
            setLoggedOutState(accountLabel, accountLink, logoutBtn);
        }
    } else if (accountLabel && accountLink) {
        setLoggedOutState(accountLabel, accountLink, logoutBtn);
    }
}

function setLoggedOutState(accountLabel, accountLink, logoutBtn) {
    accountLabel.textContent = 'Hi there, Sign in';
    accountLink.textContent = 'Account & Lists';
    accountLink.href = 'login.html';
    
    // Hide logout button
    if (logoutBtn) {
        logoutBtn.style.display = 'none';
    }
}

// Logout function
window.logout = function() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('supabase_session');
    window.location.href = 'index.html';
};
