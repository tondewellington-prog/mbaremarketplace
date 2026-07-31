// api.js
// Make these available globally by attaching to window
window.SUPABASE_URL = 'https://fnncerdxfhwlrdopswpx.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_qjN17tdmLu5yvp9iIUBEjg_ZDZCWMhK';

// Also keep them as const for use within this file
const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

// Helper function to format phone number
function formatPhoneNumber(phone, countryCode = '263') {
    if (!phone) return null;
    
    // Remove all non-numeric characters
    let cleaned = phone.toString().replace(/\D/g, '');
    
    // Remove leading zero if present
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }
    
    // Remove country code if already present (to avoid duplication)
    if (cleaned.startsWith(countryCode)) {
        cleaned = cleaned.substring(countryCode.length);
    }
    
    // Add country code
    return countryCode + cleaned;
}

// Helper function to get headers
function getHeaders(includeAuth = false) {
    const headers = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
    };
    
    if (includeAuth) {
        const session = localStorage.getItem('supabase_session');
        if (session) {
            try {
                const parsed = JSON.parse(session);
                if (parsed.access_token) {
                    headers['Authorization'] = `Bearer ${parsed.access_token}`;
                }
            } catch (e) {}
        }
    }
    
    return headers;
}

// Helper function to create user profile
async function createUserProfile(userId, email, userMetadata = {}) {
    try {
        console.log('📝 Creating profile for user:', userId);
        console.log('📝 User metadata:', userMetadata);
        
        // Get name - use provided name, fallback to email prefix
        let name = userMetadata.full_name || userMetadata.name;
        if (!name || name === email) {
            name = email.split('@')[0];
        }
        
        // Format phone number if provided
        let phone = userMetadata.phone;
        if (phone) {
            phone = formatPhoneNumber(phone);
            console.log('📞 Formatted phone number:', phone);
        }
        
        const shop_name = userMetadata.shop_name || null;
        const address = userMetadata.address || null;
        // Use 'customer' role instead of 'user' (matches your table)
        const role = userMetadata.role || 'customer';
        
        const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                id: userId,
                email: email,
                name: name,
                phone: phone,
                shop_name: shop_name,
                address: address,
                role: role,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
        });
        
        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error('❌ Failed to create profile:', errorText);
            return { success: false, error: errorText };
        }
        
        const newProfile = await createResponse.json();
        console.log('✅ Profile created successfully:', newProfile);
        return { success: true, profile: newProfile };
        
    } catch (error) {
        console.error('❌ Error creating profile:', error);
        return { success: false, error: error.message };
    }
}

// Helper function to check and recreate user profile if missing
async function ensureUserProfile(userId, email, userMetadata = {}) {
    try {
        console.log('🔍 Checking profile for user:', userId, 'Email:', email);
        
        // Check if profile exists
        const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=*`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY
            }
        });
        
        if (!checkResponse.ok) {
            console.error('❌ Failed to check profile:', await checkResponse.text());
            console.log('🔄 Attempting to recreate profile anyway...');
            return await createUserProfile(userId, email, userMetadata);
        }
        
        const existingProfiles = await checkResponse.json();
        
        if (existingProfiles && existingProfiles.length > 0) {
            console.log('✅ Profile found for user:', userId);
            return { success: true, profile: existingProfiles[0], exists: true };
        }
        
        console.log('⚠️⚠️⚠️ PROFILE MISSING for user:', userId);
        console.log('🔄 RECREATING profile automatically...');
        
        const createResult = await createUserProfile(userId, email, userMetadata);
        
        if (createResult.success) {
            console.log('✅ Profile successfully RECREATED for user:', userId);
        } else {
            console.error('❌ Failed to recreate profile:', createResult.error);
        }
        
        return { ...createResult, exists: false, recreated: true };
        
    } catch (error) {
        console.error('❌ Error in ensureUserProfile:', error);
        return await createUserProfile(userId, email, userMetadata);
    }
}

// ============================================
// GET SELLER CONTACT - WITH UPDATED WHATSAPP MESSAGE
// ============================================
async function getSellerContact(productId) {
    try {
        // Fetch product with seller info
        const response = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}&select=*,seller:seller_id(*)`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY
            }
        });
        
        const product = await response.json();
        
        if (!product || product.length === 0) {
            return { success: false, error: 'Product not found' };
        }
        
        const seller = product[0].seller;
        const productName = product[0].name;
        
        if (!seller || !seller.business_phone) {
            return { success: false, error: 'Seller contact not available' };
        }
        
        // Format phone number
        let phone = seller.business_phone.toString().replace(/\D/g, '');
        if (phone.startsWith('0')) phone = phone.substring(1);
        if (!phone.startsWith('263')) phone = '263' + phone;
        
        // Get buyer info if available
        let buyerInfo = '';
        const sessionData = localStorage.getItem('supabase_session');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                const userEmail = session.user?.email;
                if (userEmail) {
                    buyerInfo = `\nBuyer email: ${userEmail}`;
                }
            } catch(e) {}
        }
        
        // ========== UPDATED WHATSAPP MESSAGE ==========
        const websiteUrl = 'https://www.mbaremarketplace.com';
        
        const message = `Hello! I am interested in ${productName}, I saw it on ${websiteUrl}${buyerInfo}`;
        // =============================================
        
        const encodedMessage = encodeURIComponent(message);
        const whatsappLink = `https://wa.me/${phone}?text=${encodedMessage}`;
        
        console.log('WhatsApp message:', message);
        console.log('WhatsApp link:', whatsappLink);
        
        return {
            success: true,
            seller: seller,
            whatsappLink: whatsappLink,
            phone: seller.business_phone
        };
        
    } catch (error) {
        console.error('Error getting seller contact:', error);
        return { success: false, error: error.message };
    }
}

// Make getSellerContact available globally
window.getSellerContact = getSellerContact;

// ============================================
// MESSAGING FUNCTIONS - ADDED FOR messages.html
// ============================================

// Get user's conversations
async function getConversations(userId) {
    try {
        const headers = getHeaders(true);
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/conversations?or=(buyer_id.eq.${userId},seller_id.eq.${userId})&select=*&order=last_message_at.desc`,
            {
                method: 'GET',
                headers: headers
            }
        );
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('401 Unauthorized - Please login again');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Get conversations error:', error);
        throw error;
    }
}

// Get messages for a specific conversation
async function getMessages(conversationId) {
    try {
        const headers = getHeaders(true);
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/messages?conversation_id=eq.${conversationId}&select=*&order=created_at.asc`,
            {
                method: 'GET',
                headers: headers
            }
        );
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('401 Unauthorized - Please login again');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Get messages error:', error);
        throw error;
    }
}

// Send a new message
async function sendMessage(conversationId, senderId, message) {
    try {
        const headers = getHeaders(true);
        const response = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
            method: 'POST',
            headers: {
                ...headers,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                conversation_id: conversationId,
                sender_id: senderId,
                message: message,
                created_at: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('401 Unauthorized - Please login again');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Send message error:', error);
        throw error;
    }
}

// Update a conversation (mark as read, update last message, etc.)
async function updateConversation(conversationId, updates) {
    try {
        const headers = getHeaders(true);
        const response = await fetch(`${SUPABASE_URL}/rest/v1/conversations?id=eq.${conversationId}`, {
            method: 'PATCH',
            headers: {
                ...headers,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('401 Unauthorized - Please login again');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Update conversation error:', error);
        throw error;
    }
}

// Create a new conversation
async function createConversation(data) {
    try {
        const headers = getHeaders(true);
        const response = await fetch(`${SUPABASE_URL}/rest/v1/conversations`, {
            method: 'POST',
            headers: {
                ...headers,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                product_id: data.product_id,
                buyer_id: data.buyer_id,
                seller_id: data.seller_id,
                subject: data.subject || 'New Conversation',
                last_message: null,
                last_message_at: new Date().toISOString(),
                unread_buyer: 0,
                unread_seller: 0
            })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('401 Unauthorized - Please login again');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Create conversation error:', error);
        throw error;
    }
}

const api = {
    async login(email, password) {
        try {
            console.log('🔐 Attempting login for:', email);
            
            const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ 
                    email: email, 
                    password: password 
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                if (data.error_description && data.error_description.includes('Email not confirmed')) {
                    throw new Error('Please confirm your email address before logging in. Check your inbox for the confirmation link.');
                }
                throw new Error(data.error_description || data.msg || 'Invalid login credentials');
            }
            
            if (data.access_token) {
                localStorage.setItem('supabase_session', JSON.stringify(data));
                localStorage.setItem('isLoggedIn', 'true');
                
                const userMetadata = data.user?.user_metadata || {};
                
                const profileResult = await ensureUserProfile(
                    data.user.id, 
                    email, 
                    userMetadata
                );
                
                if (profileResult.success && profileResult.profile) {
                    localStorage.setItem('user_profile', JSON.stringify(profileResult.profile));
                    
                    if (profileResult.recreated) {
                        console.log('🔄🔄🔄 USER PROFILE WAS RECREATED AUTOMATICALLY!');
                    } else if (!profileResult.exists) {
                        console.log('✅ New user profile created');
                    } else {
                        console.log('✅ Existing user profile loaded');
                    }
                }
            }
            
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    async register(userData) {
        try {
            console.log('📝 Registering user:', userData.email);
            console.log('📝 Received name:', userData.name);
            console.log('📝 Received phone:', userData.phone);
            
            // Format phone number if provided
            let formattedPhone = null;
            if (userData.phone) {
                formattedPhone = formatPhoneNumber(userData.phone);
                console.log('📞 Formatted phone:', formattedPhone);
            }
            
            const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    email: userData.email,
                    password: userData.password,
                    options: {
                        data: {
                            full_name: userData.name,
                            name: userData.name,
                            phone: formattedPhone || userData.phone || '',
                            shop_name: userData.shop_name || '',
                            address: userData.address || '',
                            role: userData.role || 'customer'
                        }
                    }
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                if (data.msg && data.msg.includes('already registered')) {
                    throw new Error('This email is already registered. Please login instead.');
                }
                throw new Error(data.msg || data.error_description || 'Registration failed');
            }
            
            if (data.user) {
                console.log('✅ Auth user created:', data.user.id);
                
                if (data.user.confirmed_at === null) {
                    console.log('📧 Email confirmation required.');
                    return { 
                        success: true, 
                        user: data.user, 
                        requiresConfirmation: true,
                        message: `A confirmation email has been sent to ${userData.email}. Please check your inbox.`
                    };
                }
                
                const userMetadata = {
                    full_name: userData.name,
                    name: userData.name,
                    phone: formattedPhone || userData.phone,
                    shop_name: userData.shop_name,
                    address: userData.address,
                    role: userData.role || 'customer'
                };
                
                const profileResult = await createUserProfile(
                    data.user.id,
                    userData.email,
                    userMetadata
                );
                
                if (profileResult.success) {
                    console.log('✅ User profile created with name:', profileResult.profile[0]?.name);
                    console.log('✅ Phone saved:', profileResult.profile[0]?.phone);
                    localStorage.setItem('user_profile', JSON.stringify(profileResult.profile));
                } else {
                    console.error('❌ Failed to create profile:', profileResult.error);
                }
            }
            
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    },

    async getProducts() {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error('Failed to fetch products');
            }
            
            return data;
        } catch (error) {
            console.error('Get products error:', error);
            return [];
        }
    },

    async getCurrentUser() {
        try {
            const session = localStorage.getItem('supabase_session');
            if (!session) {
                return { success: false, user: null };
            }
            
            const parsedSession = JSON.parse(session);
            if (!parsedSession.access_token) {
                return { success: false, user: null };
            }
            
            const userId = parsedSession.user?.id;
            if (userId) {
                const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=*`, {
                    method: 'GET',
                    headers: getHeaders(true)
                });
                
                const profiles = await profileResponse.json();
                if (profiles && profiles.length > 0) {
                    return { success: true, user: parsedSession.user, profile: profiles[0] };
                }
            }
            
            return { success: true, user: parsedSession.user, profile: null };
        } catch (error) {
            console.error('Get current user error:', error);
            return { success: false, user: null, error: error.message };
        }
    },

    async updateUserProfile(userId, updates) {
        try {
            const session = localStorage.getItem('supabase_session');
            let accessToken = '';
            if (session) {
                const parsed = JSON.parse(session);
                accessToken = parsed.access_token || '';
            }
            
            // Format phone if being updated
            if (updates.phone) {
                updates.phone = formatPhoneNumber(updates.phone);
            }
            
            const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update profile');
            }
            
            const updatedProfile = await response.json();
            localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
            
            return { success: true, profile: updatedProfile };
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, error: error.message };
        }
    },

    async logout() {
        try {
            const session = localStorage.getItem('supabase_session');
            if (session) {
                const parsed = JSON.parse(session);
                if (parsed.access_token) {
                    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${parsed.access_token}`
                        }
                    });
                }
            }
        } catch (e) {
            console.error('Logout API error:', e);
        }
        
        localStorage.removeItem('supabase_session');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('user_profile');
        window.location.href = 'index.html';
        return { success: true };
    },

    // ============================================
    // MESSAGING METHODS - ADDED TO API OBJECT
    // ============================================
    getConversations: getConversations,
    getMessages: getMessages,
    sendMessage: sendMessage,
    updateConversation: updateConversation,
    createConversation: createConversation
};

// Make individual functions available globally
window.getConversations = getConversations;
window.getMessages = getMessages;
window.sendMessage = sendMessage;
window.updateConversation = updateConversation;
window.createConversation = createConversation;

// Make api available globally
window.api = api;

console.log('✅ API.js loaded with phone formatting and correct roles');
console.log('✅ WhatsApp message includes website URL: https://www.mbaremarketplace.com');
console.log('✅ Messaging functions added for messages.html');
