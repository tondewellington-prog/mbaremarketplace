// js/pages/login.js
// Registration and login form handlers for login.html

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

    // Determine confirm method
    const confirmRadios = document.querySelectorAll('input[name="confirmMethod"]');
    let confirmMethod = 'email';
    confirmRadios.forEach(r => { if (r.checked) confirmMethod = r.value; });

    // Format phone number: remove non-digits, combine with country code
    let cleanedLocal = (phoneLocal || '').replace(/\D/g, '');
    if (cleanedLocal.startsWith('0')) {
        cleanedLocal = cleanedLocal.substring(1);
    }
    let fullPhone = cleanedLocal ? (countryCode + cleanedLocal) : '';

    // If user picked WhatsApp, phone is required
    if (confirmMethod === 'whatsapp' && !fullPhone) {
        showNotification('Please enter your WhatsApp phone number.', 'error');
        return;
    }

    try {
        // ==================================================
        // WHATSAPP PATH — creates user via Edge Function + sends WhatsApp link
        // ==================================================
        if (confirmMethod === 'whatsapp') {
            showNotification('Creating account and sending WhatsApp confirmation…', 'info');

            const response = await window.api.registerWithWhatsApp({
                name: name,
                email: email,
                password: password,
                phone: fullPhone,
                role: role
            });

            if (response.success) {
                showNotification(
                    '✅ Account created! We sent a confirmation link to your WhatsApp (' + (response.phone || fullPhone) + '). Tap the link to activate your account.',
                    'confirm-purple'
                );

                hideRegisterForm();
                document.getElementById('regName').value = '';
                document.getElementById('regEmail').value = '';
                document.getElementById('regPassword').value = '';
                document.getElementById('regPhone').value = '';
            }
            return;
        }

        // ==================================================
        // EMAIL PATH — unchanged from before
        // ==================================================
        showNotification('Creating account...', 'info');

        const response = await window.api.register({
            name: name,
            email: email,
            password: password,
            phone: fullPhone,
            role: role
        });

        if (response.success) {
            showNotification('✅ Account successfully created! Please check your email to confirm your account before logging in.', 'confirm-purple');

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

    if (type === 'error') {
        notification.style.backgroundColor = '#d32f2f';
    } else if (type === 'success') {
        notification.style.backgroundColor = '#2e7d32';
    } else if (type === 'confirm-purple') {
        notification.style.backgroundColor = '#6b38af';
    } else {
        notification.style.backgroundColor = '#232F3E';
    }

    notification.innerHTML = message;
    document.body.appendChild(notification);

    const duration = type === 'confirm-purple' ? 8000 : 3500;

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

// Expose handleRegister so the inline onsubmit in login.html reaches it
window.__handleRegisterImpl = handleRegister;

// Also expose globally for any other pages that call it directly
window.handleRegister = handleRegister;
window.handleLogin = handleLogin;
window.showRegisterForm = showRegisterForm;
window.hideRegisterForm = hideRegisterForm;
window.showNotification = showNotification;
