// ============================================
// API Client for Mbare Marketplace Backend
// ============================================

const API_BASE_URL = 'http://supabase.auth.signUp/api';

class ApiClient {
    constructor() {
        this.token = localStorage.getItem('token') || null;
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { Authorization: `Bearer ${this.token}` }),
                ...options.headers
            }
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth methods
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: userData
        });
    }

    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: { email, password }
        });
        if (data.token) {
            this.setToken(data.token);
        }
        return data;
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }

    async updateProfile(profileData) {
        return this.request('/auth/update-profile', {
            method: 'PUT',
            body: profileData
        });
    }

    // Product methods
    async getProducts(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/products?${queryString}`);
    }

    async getProduct(id) {
        return this.request(`/products/${id}`);
    }

    // Basket methods
    async getBasket() {
        return this.request('/basket');
    }

    async addToBasket(productId, quantity = 1) {
        return this.request('/basket', {
            method: 'POST',
            body: { productId, quantity }
        });
    }

    async updateBasketItem(productId, quantity) {
        return this.request(`/basket/${productId}`, {
            method: 'PUT',
            body: { quantity }
        });
    }

    async removeFromBasket(productId) {
        return this.request(`/basket/${productId}`, {
            method: 'DELETE'
        });
    }

    async clearBasket() {
        return this.request('/basket', {
            method: 'DELETE'
        });
    }

    // Order methods
    async getOrders() {
        return this.request('/orders');
    }

    async getOrder(id) {
        return this.request(`/orders/${id}`);
    }

    async createOrder(orderData) {
        return this.request('/orders', {
            method: 'POST',
            body: orderData
        });
    }

    // Seller methods
    async registerAsSeller(sellerData) {
        return this.request('/sellers/register', {
            method: 'POST',
            body: sellerData
        });
    }

    async getSeller(sellerId) {
        return this.request(`/sellers/${sellerId}`);
    }

    async getSellerProducts() {
        return this.request('/sellers/products');
    }

    async createSellerProduct(productData) {
        return this.request('/sellers/products', {
            method: 'POST',
            body: productData
        });
    }

    // Review methods
    async createReview(reviewData) {
        return this.request('/reviews', {
            method: 'POST',
            body: reviewData
        });
    }

    async getSellerReviews(sellerId) {
        return this.request(`/reviews/seller/${sellerId}`);
    }
}

// Create global API instance
const api = new ApiClient();

