// ============================================
    // AFFILIATE TRACKING CODE - WITH DUPLICATION PREVENTION
    // ============================================
    
    const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubmNlcmR4Zmh3bHJkb3Bzd3B4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwMTgwOSwiZXhwIjoyMDgyNjc3ODA5fQ.gS45zReH5gtMeTY74tjb6ECfdjENglLejU4kTFNnIh0';
    const SUPABASE_URL = 'https://fnncerdxfhwlrdopswpx.supabase.co';
    
    // Get affiliate parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const affiliateCode = urlParams.get('ref');
    const utmSource = urlParams.get('utm_source') || urlParams.get('source') || 'direct';
    
    // Check if current user is logged in or already a seller
    async function checkExistingUser() {
        const sessionData = localStorage.getItem('supabase_session');
        if (!sessionData) return null;
        
        try {
            const session = JSON.parse(sessionData);
            const userId = session.user?.id;
            if (!userId) return null;
            
            // FIXED: Use 'user_id' column (matches your database)
            const response = await fetch(`${SUPABASE_URL}/rest/v1/sellers?user_id=eq.${encodeURIComponent(userId)}&select=id`, {
                headers: {
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                }
            });
            const sellers = await response.json();
            return sellers && sellers.length > 0 ? sellers[0] : null;
        } catch(e) {
            console.error('Error checking existing user:', e);
            return null;
        }
    }
    
    // Check if this email is already registered as a seller
    async function checkEmailExists(email) {
        if (!email) return false;
        
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/sellers?email=eq.${encodeURIComponent(email)}&select=id`, {
                headers: {
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                }
            });
            const sellers = await response.json();
            return sellers && sellers.length > 0;
        } catch(e) {
            console.error('Error checking email:', e);
            return false;
        }
    }
    
    // Check if this email was already referred by this affiliate (prevent double counting)
    async function checkAlreadyReferred(email, affiliateId) {
        if (!email || !affiliateId) return false;
        
        try {
            const sellerRes = await fetch(`${SUPABASE_URL}/rest/v1/sellers?email=eq.${encodeURIComponent(email)}&select=id`, {
                headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
            });
            const sellers = await sellerRes.json();
            if (!sellers || sellers.length === 0) return false;
            
            const sellerId = sellers[0].id;
            
            const referralRes = await fetch(`${SUPABASE_URL}/rest/v1/referrals?affiliate_id=eq.${affiliateId}&referred_seller_id=eq.${sellerId}&select=id`, {
                headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
            });
            const referrals = await referralRes.json();
            return referrals && referrals.length > 0;
        } catch(e) {
            console.error('Error checking existing referral:', e);
            return false;
        }
    }
    
    // Store affiliate info for later use
    if (affiliateCode) {
        console.log('Affiliate link detected:', affiliateCode, 'Source:', utmSource);
        
        fetch(`${SUPABASE_URL}/rest/v1/affiliates?affiliate_code=eq.${affiliateCode}&select=id,seller_id`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            }
        })
        .then(res => res.json())
        .then(async (affiliates) => {
            if (affiliates && affiliates.length > 0) {
                const affiliateId = affiliates[0].id;
                const affiliateSellerId = affiliates[0].seller_id;
                
                const sessionData = localStorage.getItem('supabase_session');
                let currentUserId = null;
                if (sessionData) {
                    try {
                        const session = JSON.parse(sessionData);
                        currentUserId = session.user?.id;
                    } catch(e) {}
                }
                
                if (currentUserId && currentUserId === affiliateSellerId) {
                    console.log('Self-referral detected - not tracking');
                    localStorage.setItem('affiliate_blocked_reason', 'self_referral');
                    return;
                }
                
                localStorage.setItem('affiliate_ref_code', affiliateCode);
                localStorage.setItem('affiliate_id', affiliateId);
                localStorage.setItem('affiliate_utm_source', utmSource);
                localStorage.setItem('affiliate_timestamp', new Date().toISOString());
                
                await fetch(`${SUPABASE_URL}/rest/v1/affiliate_clicks`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_SERVICE_KEY,
                        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        affiliate_id: affiliateId,
                        click_date: new Date().toISOString(),
                        source_domain: window.location.hostname,
                        utm_source: utmSource,
                        user_agent: navigator.userAgent,
                        converted: false,
                        converted_to_seller_id: null
                    })
                });
                
                console.log('Affiliate click tracked successfully');
            }
        })
        .catch(err => console.error('Affiliate tracking error:', err));
    }
    
    // Function to call when user successfully registers as a seller
    window.markAffiliateConversion = async function(newSellerId, newSellerEmail, selectedPlan) {
        const affiliateCode = localStorage.getItem('affiliate_ref_code');
        const affiliateId = localStorage.getItem('affiliate_id');
        
        if (!affiliateCode || !affiliateId) {
            console.log('No affiliate data found - not tracking conversion');
            return false;
        }
        
        const sessionData = localStorage.getItem('supabase_session');
        let currentUserId = null;
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                currentUserId = session.user?.id;
            } catch(e) {}
        }
        
        try {
            const affRes = await fetch(`${SUPABASE_URL}/rest/v1/affiliates?id=eq.${affiliateId}&select=seller_id`, {
                headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
            });
            const affData = await affRes.json();
            if (affData && affData.length > 0 && currentUserId === affData[0].seller_id) {
                console.log('Self-referral blocked');
                localStorage.removeItem('affiliate_ref_code');
                localStorage.removeItem('affiliate_id');
                return false;
            }
        } catch(e) {
            console.error('Self-referral check error:', e);
        }
        
        const emailExists = await checkEmailExists(newSellerEmail);
        if (emailExists) {
            console.log('Email already registered');
            localStorage.removeItem('affiliate_ref_code');
            localStorage.removeItem('affiliate_id');
            return false;
        }
        
        const alreadyReferred = await checkAlreadyReferred(newSellerEmail, affiliateId);
        if (alreadyReferred) {
            console.log('Already referred by this affiliate');
            localStorage.removeItem('affiliate_ref_code');
            localStorage.removeItem('affiliate_id');
            return false;
        }
        
        try {
            const clickRes = await fetch(`${SUPABASE_URL}/rest/v1/affiliate_clicks?affiliate_id=eq.${affiliateId}&converted=eq.false&order=click_date.desc&limit=1`, {
                headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
            });
            const clicks = await clickRes.json();
            if (clicks && clicks.length > 0) {
                await fetch(`${SUPABASE_URL}/rest/v1/affiliate_clicks?id=eq.${clicks[0].id}`, {
                    method: 'PATCH',
                    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ converted: true, converted_to_seller_id: newSellerId })
                });
            }
            
            let commission = 0;
            if (selectedPlan === 'tier_5') {
                commission = 1.00;
            } else if (selectedPlan === 'tier_1_50') {
                commission = 0.30;
            } else if (selectedPlan === 'tier_10') {
                commission = 2.00;
            }
            
            const existingRefRes = await fetch(`${SUPABASE_URL}/rest/v1/referrals?affiliate_id=eq.${affiliateId}&referred_seller_id=eq.${newSellerId}&select=id`, {
                headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
            });
            const existingRefs = await existingRefRes.json();
            
            if (existingRefs && existingRefs.length === 0) {
                await fetch(`${SUPABASE_URL}/rest/v1/referrals`, {
                    method: 'POST',
                    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        affiliate_id: affiliateId,
                        referred_seller_id: newSellerId,
                        referral_date: new Date().toISOString(),
                        completion_date: new Date().toISOString(),
                        referred_plan: selectedPlan,
                        commission_earned: commission,
                        status: 'completed'
                    })
                });
                
                const affUpdateRes = await fetch(`${SUPABASE_URL}/rest/v1/affiliates?id=eq.${affiliateId}`, {
                    method: 'GET',
                    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
                });
                const affData = await affUpdateRes.json();
                if (affData && affData.length > 0) {
                    const newTotal = (affData[0].total_referrals || 0) + 1;
                    await fetch(`${SUPABASE_URL}/rest/v1/affiliates?id=eq.${affiliateId}`, {
                        method: 'PATCH',
                        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ total_referrals: newTotal })
                    });
                }
                
                console.log('Affiliate conversion tracked successfully!');
            }
            
            localStorage.removeItem('affiliate_ref_code');
            localStorage.removeItem('affiliate_id');
            localStorage.removeItem('affiliate_utm_source');
            localStorage.removeItem('affiliate_timestamp');
            
            return true;
            
        } catch(err) {
            console.error('Conversion tracking error:', err);
            return false;
        }
    };
    
    window.canBeReferred = async function(email) {
        const emailExists = await checkEmailExists(email);
        if (emailExists) {
            return { allowed: false, reason: 'Email already registered' };
        }
        
        const affiliateId = localStorage.getItem('affiliate_id');
        if (affiliateId) {
            const alreadyReferred = await checkAlreadyReferred(email, affiliateId);
            if (alreadyReferred) {
                return { allowed: false, reason: 'This email has already been referred' };
            }
        }
        
        const sessionData = localStorage.getItem('supabase_session');
        if (sessionData && affiliateId) {
            try {
                const session = JSON.parse(sessionData);
                const currentUserId = session.user?.id;
                const affRes = await fetch(`${SUPABASE_URL}/rest/v1/affiliates?id=eq.${affiliateId}&select=seller_id`, {
                    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
                });
                const affData = await affRes.json();
                if (affData && affData.length > 0 && currentUserId === affData[0].seller_id) {
                    return { allowed: false, reason: 'You cannot refer yourself' };
                }
            } catch(e) {}
        }
        
        return { allowed: true, reason: '' };
    };
