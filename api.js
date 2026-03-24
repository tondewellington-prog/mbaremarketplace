// api.js
// Make these available globally by attaching to window
window.SUPABASE_URL = 'https://fnncerdxfhwlrdopswpx.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_qjN17tdmLu5yvp9iIUBEjg_ZDZCWMhK';

// Also keep them as const for use within this file
const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

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

// Helper function to create user profile (used for both new and recreated users)
async function createUserProfile(userId, email, userMetadata = {}) {
    try {
        console.log('📝 Creating profile for user:', userId);
        
        const name = userMetadata.full_name || userMetadata.name || email.split('@')[0];
        const phone = userMetadata.phone || null;
        const shop_name = userMetadata.shop_name || null;
        const address = userMetadata.address || null;
        
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
                role: 'user',
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
            // Even if check fails, try to recreate
            console.log('🔄 Attempting to recreate profile anyway...');
            return await createUserProfile(userId, email, userMetadata);
        }
        
        const existingProfiles = await checkResponse.json();
        
        // If profile exists, return it
        if (existingProfiles && existingProfiles.length > 0) {
            console.log('✅ Profile found for user:', userId);
            return { success: true, profile: existingProfiles[0], exists: true };
        }
        
        // Profile doesn't exist - RECREATE IT
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
        // Last resort: try to create profile directly
        return await createUserProfile(userId, email, userMetadata);
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
                
                // Get user metadata from the response
                const userMetadata = data.user?.user_metadata || {};
                
                // CRITICAL: Ensure user has a profile in users table
                // This will auto-recreate if the profile was deleted
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
                } else {
                    console.error('❌ Failed to get/create user profile');
                    // Don't block login even if profile creation fails
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
                            phone: userData.phone || '',
                            shop_name: userData.shop_name || '',
                            address: userData.address || ''
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
                
                // Check if email confirmation is required
                if (data.user.confirmed_at === null) {
                    console.log('📧 Email confirmation required. Confirmation email sent.');
                    return { 
                        success: true, 
                        user: data.user, 
                        requiresConfirmation: true,
                        message: 'Please check your email to confirm your account before logging in.'
                    };
                }
                
                // Create profile in users table immediately
                const userMetadata = {
                    full_name: userData.name,
                    name: userData.name,
                    phone: userData.phone,
                    shop_name: userData.shop_name,
                    address: userData.address
                };
                
                const profileResult = await createUserProfile(
                    data.user.id,
                    userData.email,
                    userMetadata
                );
                
                if (profileResult.success) {
                    console.log('✅ User profile created successfully');
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
            
            // Get user profile from users table
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
    }
};

// Make api available globally
window.api = api;

console.log('✅ API.js loaded with AUTO-RECREATION on login');
