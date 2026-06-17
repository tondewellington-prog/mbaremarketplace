// Global variables - REMOVED sellersMap (already in script.js)
        let allProducts = [];
        let filteredProducts = [];
        let currentPage = 1;
        const productsPerPage = 12;

        // Initialize page
        document.addEventListener('DOMContentLoaded', function() {
            loadSellersAndProducts();
            updateHeaderForLoggedInUser();
            
            // Get search query from URL
            const urlParams = new URLSearchParams(window.location.search);
            const query = urlParams.get('q') || '';
            if (query) {
                document.getElementById('searchInput').value = query;
                document.getElementById('searchQuery').textContent = `Search Results for "${query}"`;
            }
        });

        // Load sellers and products - using sellersMap from script.js
        async function loadSellersAndProducts() {
            try {
                const SUPABASE_URL = window.SUPABASE_URL;
                const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
                
                // Wait for sellers to load from script.js
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Load products
                const productsRes = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`, {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                });
                const products = await productsRes.json();
                
                // Map products with seller info from sellersMap (from script.js)
                if (Array.isArray(products)) {
                    allProducts = products.map(p => ({
                        id: p.id,
                        title: p.title,
                        price: parseFloat(p.price),
                        category: p.category || 'Uncategorized',
                        description: p.description || '',
                        image: p.image_url || 'https://via.placeholder.com/300x300?text=Product',
                        image_url: p.image_url,
                        seller_id: p.seller_id,
                        seller: window.sellersMap ? window.sellersMap[p.seller_id] : null,
                        rating: 4.0,
                        reviews: 0
                    }));
                }
                
                // Perform initial search
                performSearch();
                
            } catch (error) {
                console.error('Error loading data:', error);
                showError('Failed to load products. Please try again.');
            }
        }

        // Perform search
        function performSearch() {
            const urlParams = new URLSearchParams(window.location.search);
            const query = urlParams.get('q') || '';
            const category = urlParams.get('category') || 'all';
            
            // Filter by search query
            filteredProducts = allProducts.filter(product => {
                const matchesQuery = query === '' || 
                    product.title.toLowerCase().includes(query.toLowerCase()) ||
                    (product.description && product.description.toLowerCase().includes(query.toLowerCase()));
                
                const matchesCategory = category === 'all' || 
                    product.category.toLowerCase() === category.toLowerCase();
                
                return matchesQuery && matchesCategory;
            });
            
            // Apply price filter
            applyPriceFilter();
            
            // Update results info
            document.getElementById('resultsInfo').textContent = 
                `Found ${filteredProducts.length} results`;
            
            // Display results
            displayResults();
        }

        // Apply price filter
        function applyPriceFilter() {
            const priceFilter = document.getElementById('priceFilter').value;
            
            if (priceFilter !== 'all') {
                filteredProducts = filteredProducts.filter(product => {
                    const price = product.price;
                    switch(priceFilter) {
                        case 'under25': return price < 25;
                        case '25to50': return price >= 25 && price < 50;
                        case '50to100': return price >= 50 && price < 100;
                        case 'over100': return price >= 100;
                        default: return true;
                    }
                });
            }
        }

        // Apply sorting
        function applySorting() {
            const sortBy = document.getElementById('sortBy').value;
            
            switch(sortBy) {
                case 'priceLow':
                    filteredProducts.sort((a, b) => a.price - b.price);
                    break;
                case 'priceHigh':
                    filteredProducts.sort((a, b) => b.price - a.price);
                    break;
                case 'rating':
                    filteredProducts.sort((a, b) => b.rating - a.rating);
                    break;
                default:
                    // Keep original order (by created_at)
                    break;
            }
        }

        // Apply all filters
        function applyFilters() {
            // Reset to all products
            performSearch();
            
            // Apply sorting
            applySorting();
            
            // Reset to first page
            currentPage = 1;
            
            // Display results
            displayResults();
        }

        // Display results with pagination
        function displayResults() {
            const resultsContainer = document.getElementById('searchResults');
            const paginationContainer = document.getElementById('pagination');
            
            if (filteredProducts.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="no-results">
                        <h2>No products found</h2>
                        <p>Try adjusting your search or filter to find what you're looking for.</p>
                        <a href="index.html" class="btn-shop">Browse All Products</a>
                    </div>
                `;
                paginationContainer.innerHTML = '';
                return;
            }
            
            // Calculate pagination
            const startIndex = (currentPage - 1) * productsPerPage;
            const endIndex = startIndex + productsPerPage;
            const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
            const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
            
            // Display products
            resultsContainer.innerHTML = paginatedProducts.map(product => {
                const sellerName = product.seller?.business_name || 'Unknown Seller';
                return `
                    <div class="product-card" onclick="goToProductDetail(${product.id})">
                        <img src="${product.image}" alt="${product.title}" onerror="this.src='https://via.placeholder.com/300x300?text=Product'">
                        <h3>${product.title}</h3>
                        <div class="product-price">$${product.price.toFixed(2)}</div>
                        <div class="product-category">${product.category}</div>
                        <div class="product-seller">Seller: ${sellerName}</div>
                    </div>
                `;
            }).join('');
            
            // Create pagination
            let paginationHtml = '';
            if (totalPages > 1) {
                paginationHtml += `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>❮ Prev</button>`;
                
                for (let i = 1; i <= totalPages; i++) {
                    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                        paginationHtml += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
                    } else if (i === currentPage - 3 || i === currentPage + 3) {
                        paginationHtml += `<button disabled>...</button>`;
                    }
                }
                
                paginationHtml += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next ❯</button>`;
            }
            
            paginationContainer.innerHTML = paginationHtml;
        }

        // Change page
        function changePage(page) {
            currentPage = page;
            displayResults();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Go to product detail
        function goToProductDetail(productId) {
            window.location.href = `product-detail.html?id=${productId}`;
        }

        // Handle search from header
        window.handleSearch = function() {
            if (window.uiCommon) {
                window.uiCommon.handleSearchRedirect({ includeCategory: true, defaultCategory: 'all' });
            }
        };

        // Show error message
        function showError(message) {
            const resultsContainer = document.getElementById('searchResults');
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <h2>Error</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn-shop">Try Again</button>
                </div>
            `;
        }

        // Update header for logged in user
        function updateHeaderForLoggedInUser() {
            if (!window.uiCommon) return;
            window.uiCommon.updateHeaderForLoggedInUser({
                accountLabelId: 'accountLabel',
                accountLinkId: 'accountLink',
                logoutBtnId: 'logoutBtn'
            });
        }

        // Logout function
        window.logout = function() {
            if (window.uiCommon) window.uiCommon.logoutToHome(true);
        };
