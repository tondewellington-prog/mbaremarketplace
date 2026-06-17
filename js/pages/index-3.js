if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js', { 
                updateViaCache: 'none'
            }).then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
                
                setInterval(() => {
                    registration.update();
                    console.log('Checking for service worker updates...');
                }, 60000);
            }).catch(err => {
                console.log('Service Worker registration failed:', err);
            });
        });
    }
