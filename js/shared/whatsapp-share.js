// ============================================
// WhatsApp Product Sharing - Mbare Marketplace
// ============================================
// One tap creates a WhatsApp message with a rich preview card
// (product photo, price, Mbare link) using the product-share
// Supabase Edge Function.

(function () {
    "use strict";

    const SHARE_ENDPOINT =
        "https://fnncerdxfhwlrdopswpx.supabase.co/functions/v1/product-share";

    /**
     * Share a product to WhatsApp.
     * Call as: onclick="shareProductToWhatsApp(this)"
     * Or: shareProductToWhatsApp(null, { id, title, price, ... })
     */
    window.shareProductToWhatsApp = function (buttonEl, productData) {
        let product = productData;

        // From a product card button
        if (!product && buttonEl) {
            const card = buttonEl.closest(".product-card");
            if (card) {
                product = {
                    id: card.dataset.productId,
                    title: card.dataset.productTitle,
                    price: card.dataset.productPrice,
                    image: card.dataset.productImage,
                    seller_name: card.dataset.sellerName,
                    category: card.dataset.category,
                };
            }
        }

        // From the product detail page
        if (!product && window.currentProduct) {
            product = window.currentProduct;
        }

        if (!product || !product.id) {
            console.warn("[whatsapp-share] No product data available");
            return;
        }

        const price = `$${Number(product.price || 0).toFixed(2)}`;
        const productUrl = `${SHARE_ENDPOINT}?id=${encodeURIComponent(product.id)}`;

        const lines = [
            `*${product.title || "Product"}*`,
            `Price: ${price}`,
            product.seller_name ? `Seller: ${product.seller_name}` : null,
            "",
            "Buy it on Mbare Marketplace:",
            productUrl,
        ].filter(Boolean);

        const message = lines.join("\n");
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

        if (typeof trackAnalyticsEvent === "function") {
            trackAnalyticsEvent("whatsapp_share", {
                product_id: product.id,
                product_title: product.title,
                price: product.price,
            });
        }

        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    };

    /**
     * Share a whole category page.
     * Call as: onclick="shareCategoryToWhatsApp('Electronics')"
     */
    window.shareCategoryToWhatsApp = function (categoryName) {
        if (!categoryName) return;

        const categoryUrl = `${SHARE_ENDPOINT}?category=${encodeURIComponent(categoryName)}`;

        const lines = [
            `*${categoryName} on Mbare Marketplace*`,
            "",
            "Browse listings:",
            categoryUrl,
        ];

        const message = lines.join("\n");
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    };

    /**
     * Optional analytics stub. Replace with real tracking if desired.
     */
    function trackAnalyticsEvent(name, payload) {
        console.log("[analytics]", name, payload);
    }
})();
