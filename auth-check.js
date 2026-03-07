// auth-check.js

document.addEventListener('DOMContentLoaded', function() {
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
