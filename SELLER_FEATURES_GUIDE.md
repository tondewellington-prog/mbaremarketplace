# Seller Features Guide

## ✅ What's Been Implemented

### 1. Seller Registration
- **Page**: `seller-register.html`
- Sellers can register with:
  - Shop name
  - WhatsApp number (for buyer contact)
  - Shop location (street, city, area)
- After registration, users get `seller` role

### 2. Seller Dashboard
- **Page**: `seller-dashboard.html`
- Sellers can:
  - Post new products
  - View their products
  - Edit/Delete their products
- Access via: Login → Navigate to "Sell" in nav menu

### 3. Product Display with Seller Info
- Product detail pages now show:
  - Seller shop name
  - Seller rating (if available)
  - Shop location
  - **WhatsApp contact button** - Direct link to chat with seller
- Buyers can contact sellers directly via WhatsApp

### 4. Seller Rating System
- **Page**: `rate-seller.html`
- After purchase, buyers are redirected to rate the seller
- Buyers can:
  - Rate seller (1-5 stars)
  - Write a review
- Seller ratings are automatically calculated and displayed

## 🔧 Setup Instructions

### 1. Update Database Schema

Run the SQL update in Supabase:

```sql
-- Run this in Supabase SQL Editor
-- File: backend/supabase/schema_update.sql
```

This adds:
- Seller role to users
- WhatsApp number and shop location fields
- Seller reviews table
- Rating calculation triggers

### 2. Backend Routes

New routes added:
- `POST /api/sellers/register` - Register as seller
- `GET /api/sellers/:sellerId` - Get seller info
- `POST /api/sellers/products` - Create product (seller)
- `GET /api/sellers/products` - Get seller's products
- `POST /api/reviews` - Create seller review
- `GET /api/reviews/seller/:sellerId` - Get seller reviews

### 3. Frontend Pages

New pages:
- `seller-register.html` - Seller registration
- `seller-dashboard.html` - Seller product management
- `rate-seller.html` - Rate seller after purchase

## 📱 How It Works

### For Sellers:

1. **Register as Seller:**
   - Go to `seller-register.html`
   - Fill in shop details
   - Submit registration

2. **Post Products:**
   - Login
   - Go to Seller Dashboard
   - Click "Add New Product"
   - Fill in product details
   - Submit

3. **Manage Products:**
   - View all your products
   - Edit or delete products

### For Buyers:

1. **Browse Products:**
   - Products show seller info
   - See seller rating and location

2. **Contact Seller:**
   - Click "Contact Seller on WhatsApp" button
   - Opens WhatsApp with pre-filled message
   - Chat directly with seller

3. **Purchase:**
   - Add to basket
   - Checkout
   - After purchase, rate the seller

## 🎯 Key Features

### WhatsApp Integration
- Direct WhatsApp links with pre-filled messages
- Format: `https://wa.me/[number]?text=[message]`
- Automatically formats phone numbers

### Seller Location Display
- Shows shop location on product pages
- Format: Street, Area, City
- Helps buyers find physical shops

### Rating System
- 1-5 star ratings
- Optional text reviews
- Automatic seller rating calculation
- Displayed on product pages

## 🔍 Testing

### Test Seller Registration:
1. Login as regular user
2. Go to `seller-register.html`
3. Fill in shop details
4. Submit
5. Check user role in database (should be 'seller')

### Test Product Posting:
1. Login as seller
2. Go to Seller Dashboard
3. Add a product
4. Verify it appears in product listings

### Test WhatsApp Contact:
1. View any product with seller
2. Click "Contact Seller on WhatsApp"
3. Should open WhatsApp with message

### Test Rating:
1. Complete a purchase
2. Should redirect to rating page
3. Submit rating
4. Check seller rating updates

## ⚠️ Important Notes

1. **WhatsApp Numbers:**
   - Must include country code (e.g., +263 for Zimbabwe)
   - Format: +263771234567
   - Non-numeric characters are automatically removed

2. **Seller Role:**
   - Users must register as seller to post products
   - Regular users can't post products

3. **Product Ownership:**
   - Sellers can only edit/delete their own products
   - Admins can manage all products

4. **Rating:**
   - One rating per order per seller
   - Buyers must be logged in to rate

## 🐛 Troubleshooting

### "Only sellers can post products"
- User needs to register as seller first
- Go to `seller-register.html`

### WhatsApp link not working
- Check phone number format
- Must include country code
- Remove spaces and special characters

### Rating not saving
- User must be logged in
- Check if already rated this seller for this order
- Verify backend is running

### Seller info not showing
- Check product has `seller_id`
- Verify seller has WhatsApp number
- Check database schema is updated

## 📝 Next Steps

1. Run database schema update
2. Test seller registration
3. Test product posting
4. Test WhatsApp contact
5. Test rating system

Everything should work perfectly! 🎉




