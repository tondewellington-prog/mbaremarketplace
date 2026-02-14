// auth-check.js
document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
});

function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const sessionData = localStorage.getItem('supabase_session');
    
    // Find the account menu elements
    const accountLabel = document.querySelector('.account-label');
    const accountLink = document.querySelector('.account-link');
    
    if (isLoggedIn && sessionData && accountLabel && accountLink) {
        try {
            const session = JSON.parse(sessionData);
            const userEmail = session.user?.email || 'User';
            const userName = session.user?.user_metadata?.full_name || userEmail.split('@')[0];
            
            // Update UI for logged in user
            accountLabel.textContent = 'Hello,';
            accountLink.textContent = userName;
            accountLink.href = '#'; // Change this to your account page if you have one
        } catch (e) {
            console.error('Error parsing session:', e);
            // If error, clear storage and show logged out state
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('supabase_session');
            setLoggedOutState(accountLabel, accountLink);
        }
    } else if (accountLabel && accountLink) {
        setLoggedOutState(accountLabel, accountLink);
    }
}

function setLoggedOutState(accountLabel, accountLink) {
    accountLabel.textContent = 'Hi there, Sign in';
    accountLink.textContent = 'Account & Lists';
    accountLink.href = 'login.html';
}

// Optional: Add logout function
window.logout = function() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('supabase_session');
    window.location.href = 'index.html';
};
