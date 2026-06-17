// Get plan from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const planType = urlParams.get('plan') || 'tier_150';
        
        // ============================================
        // IMPORTANT: Replace with your actual Paynow credentials
        // Get these from your Paynow dashboard
        // ============================================
        const PAYNOW_INTEGRATION_ID = '24522';  //  REPLACE THIS
        const PAYNOW_INTEGRATION_KEY = '71a4e5e6-5ddf-45ee-b8e9-b9600fb967bf'; // REPLACE THIS
        // ============================================
        
        const plans = {
            tier_150: { name: 'Merchant Basic', amount: '1.50' },
            tier_5: { name: 'Video Ads Plan', amount: '5.00' }
        };
        
        const currentPlan = plans[planType] || plans.tier_150;
        
        document.getElementById('planName').innerText = currentPlan.name;
        document.getElementById('planPrice').innerText = '$' + currentPlan.amount;
        
        let pollInterval = null;
        
        async function processPayment() {
            const phone = document.getElementById('phoneNumber').value.trim();
            const email = document.getElementById('email').value.trim();
            
            // Validate phone number (Zimbabwe format)
            if (!phone.match(/^(07|0[78])[0-9]{8}$/)) {
                showError('Please enter a valid Zimbabwe phone number (e.g., 0771234567)');
                return;
            }
            
            // Validate integration credentials are set
            if (PAYNOW_INTEGRATION_ID === 'YOUR_INTEGRATION_ID' || PAYNOW_INTEGRATION_ID === '') {
                showError('Payment system not configured. Please add your Paynow Integration ID and Key to the code.');
                return;
            }
            
            // Show loading state
            document.getElementById('paymentSection').style.display = 'none';
            document.getElementById('loader').style.display = 'block';
            document.getElementById('result').innerHTML = '';
            
            // Generate unique reference
            const reference = `SUB_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
            const customerEmail = email || `${phone}@mbaremarketplace.com`;
            
            // Build form data for Paynow
            const formData = new URLSearchParams();
            formData.append('result_url', window.location.href);
            formData.append('return_url', window.location.href);
            formData.append('reference', reference);
            formData.append('amount', currentPlan.amount);
            formData.append('id', PAYNOW_INTEGRATION_ID);
            formData.append('additionalinfo', currentPlan.name + ' Subscription - Mbare Marketplace');
            formData.append('authemail', customerEmail);
            formData.append('phonenumber', phone);
            
            try {
                // Send request to Paynow
                const response = await fetch('https://www.paynow.co.zw/interface/initiatetransaction', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString()
                });
                
                const responseText = await response.text();
                console.log('Paynow response:', responseText);
                
                // Parse response (format: SUCCESS|browserurl|pollurl)
                if (responseText.startsWith('SUCCESS')) {
                    const parts = responseText.split('|');
                    const pollUrl = parts[2];
                    
                    // Save pending payment info
                    const pendingPayment = {
                        reference: reference,
                        planType: planType,
                        phone: phone,
                        email: customerEmail,
                        timestamp: Date.now(),
                        pollUrl: pollUrl
                    };
                    localStorage.setItem('mbare_pending_payment', JSON.stringify(pendingPayment));
                    
                    // Update loader message
                    document.getElementById('loader').innerHTML = `
                        <div class="spinner"></div>
                        <div>Payment request sent to ${phone}!</div>
                        <div style="font-size: 14px; margin-top: 10px;">Check your EcoCash app or SMS</div>
                        <div style="font-size: 13px; margin-top: 8px; color: #666;">Enter your PIN to complete payment</div>
                        <div style="font-size: 12px; margin-top: 15px; color: #999;">Waiting for confirmation...</div>
                    `;
                    
                    // Start polling for payment status
                    startPolling(reference, planType);
                    
                } else if (responseText.startsWith('ERROR')) {
                    const errorMsg = responseText.split('|')[1] || 'Unknown error';
                    throw new Error(errorMsg);
                } else {
                    throw new Error('Payment initiation failed. Please try again.');
                }
            } catch (error) {
                console.error('Payment error:', error);
                showError('Payment failed: ' + error.message);
                resetPaymentForm();
            }
        }
        
        async function startPolling(reference, planType) {
            let attempts = 0;
            const maxAttempts = 60; // 5 minutes max
            
            if (pollInterval) clearInterval(pollInterval);
            
            pollInterval = setInterval(async () => {
                attempts++;
                
                try {
                    // Check status from Paynow
                    const statusUrl = `https://www.paynow.co.zw/interface/gettransactionstatus/${reference}`;
                    const response = await fetch(statusUrl);
                    const statusText = await response.text();
                    
                    console.log(`Poll attempt ${attempts}:`, statusText);
                    
                    // Check if payment is successful
                    if (statusText.includes('Paid') || statusText.includes('Completed') || statusText === 'PAID') {
                        clearInterval(pollInterval);
                        pollInterval = null;
                        
                        // Payment successful - upgrade user's tier
                        const sellerId = localStorage.getItem('mbare_seller_id') || 'seller_001';
                        localStorage.setItem(`mbare_tier_${sellerId}`, planType);
                        localStorage.setItem('mbare_subscription_active', 'true');
                        localStorage.setItem('mbare_subscription_plan', planType);
                        localStorage.setItem('mbare_subscription_date', new Date().toISOString());
                        
                        // Remove pending payment
                        localStorage.removeItem('mbare_pending_payment');
                        
                        // Show success and redirect
                        document.getElementById('loader').innerHTML = `
                            <div style="color: #155724;">✓ Payment Successful!</div>
                            <div style="margin-top: 10px;">Your ${currentPlan.name} subscription is now active.</div>
                            <div style="margin-top: 10px;">Redirecting to dashboard...</div>
                        `;
                        
                        setTimeout(() => {
                            window.location.href = 'seller-dashboard.html?payment=success&plan=' + planType;
                        }, 2000);
                        
                    } else if (statusText.includes('Cancelled') || statusText.includes('Failed') || statusText === 'CANCELLED') {
                        clearInterval(pollInterval);
                        pollInterval = null;
                        showError('Payment was cancelled or failed. Please try again.');
                        resetPaymentForm();
                        localStorage.removeItem('mbare_pending_payment');
                        
                    } else if (attempts >= maxAttempts) {
                        clearInterval(pollInterval);
                        pollInterval = null;
                        showError('Payment confirmation timed out. If money was deducted, please contact support.');
                        resetPaymentForm();
                    }
                } catch (err) {
                    console.error('Polling error:', err);
                    if (attempts >= maxAttempts) {
                        clearInterval(pollInterval);
                        pollInterval = null;
                        showError('Unable to verify payment status. Please contact support.');
                        resetPaymentForm();
                    }
                }
            }, 5000); // Poll every 5 seconds
        }
        
        function showError(message) {
            document.getElementById('result').innerHTML = `<div class="error-message"> ${message}</div>`;
        }
        
        function showInfo(message) {
            document.getElementById('result').innerHTML = `<div class="info-message"> ${message}</div>`;
        }
        
        function resetPaymentForm() {
            document.getElementById('paymentSection').style.display = 'block';
            document.getElementById('loader').style.display = 'none';
            document.getElementById('payButton').disabled = false;
        }
        
        // Check for pending payment on page load
        function checkPendingPayment() {
            const pending = localStorage.getItem('mbare_pending_payment');
            if (pending) {
                try {
                    const payment = JSON.parse(pending);
                    // Check if payment is less than 10 minutes old
                    if (Date.now() - payment.timestamp < 600000) {
                        showInfo('You have a pending payment. Checking status...');
                        startPolling(payment.reference, payment.planType);
                        document.getElementById('paymentSection').style.display = 'none';
                        document.getElementById('loader').style.display = 'block';
                    } else {
                        localStorage.removeItem('mbare_pending_payment');
                    }
                } catch(e) {
                    localStorage.removeItem('mbare_pending_payment');
                }
            }
        }
        
        // Initialize
        checkPendingPayment();
