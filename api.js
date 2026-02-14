// api.js
const SUPABASE_URL = 'https://fnncerdxfhwlrdopswpx.supabase.co'; // REPLACE THIS
const SUPABASE_ANON_KEY = 'sb_publishable_qjN17tdmLu5yvp9iIUBEjg_ZDZCWMhK'; // REPLACE THIS

const api = {
   async login(email, password) {
    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error_description || data.msg || 'Login failed');
        }
        
        if (data.access_token) {
            // Store session data
            localStorage.setItem('supabase_session', JSON.stringify(data));
            localStorage.setItem('isLoggedIn', 'true');
        }
        
        return { success: true, user: data.user };
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}},

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
    }
};

// Make api available globally
window.api = api;

