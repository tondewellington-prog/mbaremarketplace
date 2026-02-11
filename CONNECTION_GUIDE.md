# Frontend-Backend Connection Guide

## ✅ What's Been Done

1. **API Client Created** (`api.js`)
   - Handles all API calls to your Supabase backend
   - Manages authentication tokens
   - Provides easy-to-use methods for all operations

2. **Frontend Updated** (`script.js`)
   - Now loads products from API instead of hardcoded data
   - Basket syncs with backend when user is logged in
   - Falls back to localStorage when not logged in

3. **Login Page Connected**
   - Real authentication with Supabase
   - Stores JWT token for API calls

4. **Checkout Page Connected**
   - Creates orders via API
   - Works for both logged-in and guest users

5. **Responsive Design Fixed**
   - Fixed overlay issue at 930px
   - Header elements now stack properly on smaller screens

## 🔧 Configuration

### API Base URL

The API client is configured to connect to:
```
http://localhost:5000/api
```

To change this, edit `api.js`:
```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

### Backend Server

Make sure your backend is running:
```bash
cd backend
npm run dev
```

You should see:
```
✅ Supabase client initialized
🚀 Server running on port 5000
📡 API available at http://localhost:5000/api
```

## 🧪 Testing the Connection

### 1. Test Products Loading

1. Open `index.html` in browser
2. Open browser console (F12)
3. Check for any errors
4. Products should load from API

### 2. Test Authentication

1. Go to `login.html`
2. Register a new user:
   - Email: test@example.com
   - Password: password123
3. Or login with existing user
4. Should redirect to homepage on success

### 3. Test Basket

1. Add products to basket
2. If logged in: Basket syncs with backend
3. If not logged in: Uses localStorage
4. Check basket count in header updates

### 4. Test Search

1. Type in search bar
2. Press Enter
3. Should search products via API
4. Results page shows filtered products

## 🔍 Troubleshooting

### Products Not Loading

**Check:**
1. Is backend server running? (`npm run dev` in backend folder)
2. Check browser console for errors
3. Verify API URL in `api.js` matches your backend
4. Check CORS settings in backend

### Login Not Working

**Check:**
1. Backend server is running
2. Supabase credentials in backend `.env` are correct
3. Check browser console for error messages
4. Verify user exists in Supabase dashboard

### Basket Not Syncing

**Check:**
1. User is logged in (check if token exists)
2. Backend API is accessible
3. Check browser console for API errors

### CORS Errors

If you see CORS errors:
1. Check `backend/server.js` - CORS should allow your frontend URL
2. Update `FRONTEND_URL` in backend `.env`
3. Restart backend server

## 📱 Responsive Design

The header now properly handles:
- **Desktop (>1024px)**: Full layout
- **Tablet (930px-1024px)**: Search bar moves below, header-right stays
- **Mobile (<768px)**: Everything stacks vertically

## 🚀 Next Steps

1. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Open Frontend:**
   - Open `index.html` in browser
   - Or use a local server (recommended)

3. **Test Everything:**
   - Browse products
   - Register/Login
   - Add to basket
   - Search products
   - Checkout

## 💡 Tips

- **Use Browser DevTools** (F12) to see API calls
- **Check Network tab** to see API requests/responses
- **Console tab** shows any JavaScript errors
- **Application tab** shows localStorage and tokens

## ✅ Everything Should Work Now!

Your frontend is fully connected to your Supabase backend. All features should work:
- ✅ Product browsing
- ✅ User authentication
- ✅ Shopping basket
- ✅ Search functionality
- ✅ Order processing
- ✅ Responsive design

Happy coding! 🎉




