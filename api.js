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

// Helper function to check and create user profile
async function ensureUserProfile(userId, email, userMetadata = {}) {
    try {
        console.log('🔍 Checking profile for user:', userId);
        
        // Check if profile exists
        const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=*`, {
            method: 'GET',
            headers: getHeaders(true)
        });
        
        const existingProfiles = await checkResponse.json();
        
        // If profile exists, return it
        if (existingProfiles && existingProfiles.length > 0) {
            console.log('✅ Profile found for user:', userId);
            return { success: true, profile: existingProfiles[0], exists: true };
        }
        
        // Profile doesn't exist - create it
        console.log('⚠️ No profile found, creating new profile for user:', userId);
        
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
                created_at: new Date().toISOString()
            })
        });
        
        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error('❌ Failed to create profile:', errorText);
            return { success: false, error: errorText };
        }
        
        const newProfile = await createResponse.json();
        console.log('✅ Profile created successfully:', newProfile);
        return { success: true, profile: newProfile, exists: false };
        
    } catch (error) {
        console.error('❌ Error in ensureUserProfile:', error);
        return { success: false, error: error.message };
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
                throw new Error(data.error_description || data.msg || 'Login failed');
            }
            
            if (data.access_token) {
                localStorage.setItem('supabase_session', JSON.stringify(data));
                localStorage.setItem('isLoggedIn', 'true');
                
                // Get user metadata from the response
                const userMetadata = data.user?.user_metadata || {};
                
                // Ensure user has a profile in users table (auto-recreate if deleted)
                const profileResult = await ensureUserProfile(
                    data.user.id, 
                    email, 
                    userMetadata
                );
                
                if (profileResult.success && profileResult.profile) {
                    localStorage.setItem('user_profile', JSON.stringify(profileResult.profile));
                    if (!profileResult.exists) {
                        console.log('🔄 User profile was recreated automatically');
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
                throw new Error(data.msg || data.error_description || 'Registration failed');
            }
            
            if (data.user) {
                console.log('✅ Auth user created:', data.user.id);
                
                // Create profile in users table
                const createProfileResponse = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        id: data.user.id,
                        email: userData.email,
                        name: userData.name,
                        phone: userData.phone || null,
                        shop_name: userData.shop_name || null,
                        address: userData.address || null,
                        role: userData.role || 'user',
                        is_active: true,
                        created_at: new Date().toISOString()
                    })
                });
                
                if (!createProfileResponse.ok) {
                    const errorText = await createProfileResponse.text();
                    console.error('❌ Failed to create profile:', errorText);
                    // Note: Auth user was created but profile creation failed
                    // User can still login - profile will be auto-created on login
                } else {
                    const profile = await createProfileResponse.json();
                    console.log('✅ User profile created in users table');
                    localStorage.setItem('user_profile', JSON.stringify(profile));
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
            const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${localStorage.getItem('supabase_session') ? JSON.parse(localStorage.getItem('supabase_session')).access_token : ''}`,
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

console.log('✅ API.js loaded with profile management');
