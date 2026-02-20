// api.js
// Make these available globally by attaching to window
window.SUPABASE_URL = 'https://fnncerdxfhwlrdopswpx.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_qjN17tdmLu5yvp9iIUBEjg_ZDZCWMhK';

// Also keep them as const for use within this file
const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

const api = {
    async login(email, password) {
        try {
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
            }
            
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    async register(userData) {
        try {
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
                            phone: userData.phone || ''
                        }
                    }
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.msg || data.error_description || 'Registration failed');
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
            console.error('Error fetching products:', error);
            return [];
        }
    },

    async logout() {
        localStorage.removeItem('supabase_session');
        localStorage.removeItem('isLoggedIn');
        window.location.href = 'index.html';
        return { success: true };
    }
};

// Make api available globally
window.api = api;
console.log('API loaded successfully');
