document.addEventListener("DOMContentLoaded", function() {
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            if (!isLoggedIn) {
                // Keep the page layout view open, but explicitly prompt with the login box overlay
                document.getElementById('loginPromptModal').style.display = 'flex';
            }
        });
