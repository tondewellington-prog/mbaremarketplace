async function handleLogin(event) {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            showNotification('Logging in...', 'info');
            const response = await window.api.login(email, password);
            if (response.success) {
                showNotification('Login successful!', 'success');
                setTimeout(() => { window.location.href = 'index.html'; }, 1500);
            }
        } catch (error) {
            showNotification('Login failed: ' + (error.message || 'Invalid credentials'), 'error');
        }
    }
    
    async function handleRegister(event) {
        event.preventDefault();
        
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const countryCode = document.getElementById('regCountryCode').value;
        const phoneLocal = document.getElementById('regPhone').value;
        const role = document.getElementById('regRole').value;
        
        // Format phone number: remove non-digits and combine with country code
        let cleanedLocal = phoneLocal.replace(/\D/g, '');
        // Remove leading zero if present (common in local numbers)
        if (cleanedLocal.startsWith('0')) {
            cleanedLocal = cleanedLocal.substring(1);
        }
        let fullPhone = countryCode + cleanedLocal;
        
        try {
            showNotification('Creating account...', 'info');
            
            const response = await window.api.register({
                name: name,
                email: email,
                password: password,
                phone: fullPhone,
                role: role
            });
            
            if (response.success) {
                // Purple notification for successful account creation (no mail button)
                showNotification(' Account successfully created! Please check your email to confirm your account before logging in.', 'confirm-purple');
                
                hideRegisterForm();
                document.getElementById('regName').value = '';
                document.getElementById('regEmail').value = '';
                document.getElementById('regPassword').value = '';
                document.getElementById('regPhone').value = '';
            }
        } catch (error) {
            showNotification('Registration failed: ' + (error.message || 'Please try again'), 'error');
        }
    }
    
    function showNotification(message, type = 'info') {
        const existing = document.querySelector('.custom-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = 'custom-notification';
        
        // Define colors based on type
        if (type === 'error') {
            notification.style.backgroundColor = '#d32f2f';
        } else if (type === 'success') {
            notification.style.backgroundColor = '#2e7d32';
        } else if (type === 'confirm-purple') {
            notification.style.backgroundColor = '#6b38af'; // Purple color
        } else {
            notification.style.backgroundColor = '#232F3E'; // Default dark blue
        }
        
        notification.innerHTML = message;
        document.body.appendChild(notification);
        
        // Stay longer for the purple confirmation so users have time to read
        const duration = type === 'confirm-purple' ? 6000 : 3500;
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.4s';
            setTimeout(() => notification.remove(), 400);
        }, duration);
    }

    function showRegisterForm() {
        document.getElementById('registerForm').style.display = 'block';
        document.querySelector('.login-form').style.display = 'none';
    }
    
    function hideRegisterForm() {
        document.getElementById('registerForm').style.display = 'none';
        document.querySelector('.login-form').style.display = 'block';
    }
