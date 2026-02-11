# Frontend-Backend Integration Guide

This guide explains how to connect your frontend to the backend API.

## Setup

1. **Copy the API client** to your frontend directory:
   ```bash
   cp backend/api.js .
   ```

2. **Include it in your HTML**:
   ```html
   <script src="api.js"></script>
   ```

## Usage Example

### Initialize API Client

```javascript
const api = new ApiClient();
```

### Authentication

```javascript
// Register
try {
    const response = await api.register({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
    });
    console.log('Registered:', response.user);
} catch (error) {
    console.error('Registration failed:', error);
}

// Login
try {
    const response = await api.login('john@example.com', 'password123');
    console.log('Logged in:', response.user);
    // Token is automatically saved
} catch (error) {
    console.error('Login failed:', error);
}

// Get current user
try {
    const response = await api.getCurrentUser();
    console.log('Current user:', response.user);
} catch (error) {
    console.error('Failed to get user:', error);
}
```

### Products

```javascript
// Get all products
const products = await api.getProducts({
    category: 'Electronics',
    page: 1,
    limit: 12,
    sort: 'priceLow'
});

// Get single product
const product = await api.getProduct('product_id_here');
```

### Basket

```javascript
// Get basket
const basket = await api.getBasket();

// Add to basket
await api.addToBasket('product_id', 2);

// Update quantity
await api.updateBasketItem('product_id', 3);

// Remove from basket
await api.removeFromBasket('product_id');

// Clear basket
await api.clearBasket();
```

### Orders

```javascript
// Get orders
const orders = await api.getOrders();

// Create order
const order = await api.createOrder({
    items: [
        { product: 'product_id', quantity: 2 }
    ],
    shippingAddress: {
        name: 'John Doe',
        phone: '1234567890',
        street: '123 Main St',
        city: 'City',
        state: 'State',
        zipCode: '12345',
        country: 'Country'
    },
    paymentMethod: 'card'
});
```

## Updating Your Frontend Script

Replace the hardcoded products array in `script.js` with API calls:

```javascript
// Instead of:
const products = [/* hardcoded array */];

// Use:
let products = [];

// Load products from API
async function loadProductsFromAPI() {
    try {
        const response = await api.getProducts();
        products = response.products;
        // Update UI with products
        loadProducts('todaysDeals', products.slice(0, 4));
    } catch (error) {
        console.error('Failed to load products:', error);
    }
}

// Call on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadProductsFromAPI();
    // ... rest of initialization
});
```

## CORS Configuration

Make sure your backend CORS is configured to allow your frontend URL. Update `backend/server.js`:

```javascript
app.use(cors({
    origin: 'http://localhost:3000', // Your frontend URL
    credentials: true
}));
```

## Error Handling

Always wrap API calls in try-catch:

```javascript
try {
    const data = await api.getProducts();
    // Handle success
} catch (error) {
    // Handle error
    console.error('API Error:', error.message);
    // Show user-friendly error message
}
```

## Token Management

The API client automatically handles token storage. When a user logs in, the token is saved to localStorage and included in all subsequent requests.

To logout:
```javascript
api.setToken(null);
```






