(function() {
            console.log('Payment Return Page Loaded');
            console.log('Full URL:', window.location.href);
            
            const urlParams = new URLSearchParams(window.location.search);
            let guid = urlParams.get('guid') || urlParams.get('transaction') || urlParams.get('id');
            let amount = urlParams.get('amount') || '1.50';
            
            const referrer = document.referrer;
            if (!guid && referrer && referrer.includes('TransactionView')) {
                const guidMatch = referrer.match(/guid=([a-f0-9-]+)/);
                if (guidMatch) guid = guidMatch[1];
            }
            
            console.log('Extracted GUID:', guid);
            
            if (guid) {
                localStorage.setItem('payment_guid', guid);
                localStorage.setItem('payment_amount', amount);
                localStorage.setItem('payment_success', 'true');
                
                document.getElementById('statusContainer').innerHTML = `
                    <div class="checkmark success">✅</div>
                    <h2 class="success">Payment Detected!</h2>
                    <p>Transaction ID: ${guid.substring(0, 8)}...</p>
                    <p>Amount: $${amount}</p>
                    <p>Your subscription is being activated...</p>
                    <div class="spinner" style="width:30px;height:30px;"></div>
                `;
                
                setTimeout(() => {
                    window.location.href = 'seller-dashboard.html';
                }, 2000);
            } else {
                document.getElementById('statusContainer').innerHTML = `
                    <div class="checkmark warning">⚠️</div>
                    <h2>Payment Verification Needed</h2>
                    <p>If you completed payment, please enter your Transaction ID below:</p>
                    <input type="text" id="transactionId" placeholder="Enter Transaction ID (e.g., 47401944)">
                    <button onclick="verifyTransaction()">Verify Payment</button>
                    <p style="margin-top:15px; font-size:12px; color:#666;">Find your Transaction ID on the PayNow success page</p>
                `;
            }
            
            window.verifyTransaction = function() {
                const transactionId = document.getElementById('transactionId').value.trim();
                if (transactionId) {
                    localStorage.setItem('payment_success', 'true');
                    localStorage.setItem('payment_transaction', transactionId);
                    localStorage.setItem('payment_amount', '1.50');
                    
                    document.getElementById('statusContainer').innerHTML = `
                        <div class="checkmark success">✅</div>
                        <h2 class="success">Verifying...</h2>
                        <p>Please wait while we activate your subscription.</p>
                    `;
                    
                    setTimeout(() => {
                        window.location.href = 'seller-dashboard.html';
                    }, 2000);
                } else {
                    alert('Please enter your Transaction ID');
                }
            };
        })();
