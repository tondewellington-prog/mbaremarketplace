// ============================================
// WhatsApp Product Sharing - Mbare Marketplace
// ============================================
// Two modes of operation:
//
// 1. Manual — call from an onclick handler:
//      onclick="shareProductToWhatsApp(this)"
//      onclick="shareProductToWhatsApp(null, { id, title, price })"
//      onclick="shareCategoryToWhatsApp('Electronics')"
//
// 2. Auto — this script scans every .product-card on the page and
//    injects a green Share button automatically. Works with dynamic
//    content (filters, sorting, async rendering).
//
// Include once per page:
//    <script src="js/shared/whatsapp-share.js"></script>

(function () {
    "use strict";

    const SHARE_ENDPOINT =
        "https://fnncerdxfhwlrdopswpx.supabase.co/functions/v1/product-share";

    const PROCESSED_ATTR = "data-wa-share-added";

    // ============================================
    // MANUAL API (existing functions kept for compatibility)
    // ============================================

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
                product = extractProductFromCard(card);
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

        const whatsappUrl = buildWhatsAppUrl(product);
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

    // ============================================
    // HELPERS
    // ============================================

    function buildWhatsAppUrl(product) {
        const price = product.price != null
            ? `$${Number(product.price).toFixed(2)}`
            : null;
        const productUrl = `${SHARE_ENDPOINT}?id=${encodeURIComponent(product.id)}`;

        const lines = [
            `*${product.title || "Product"}*`,
            price ? `Price: ${price}` : null,
            product.seller_name ? `Seller: ${product.seller_name}` : null,
            "",
            "Buy it on Mbare Marketplace:",
            productUrl,
        ].filter(Boolean);

        return `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
    }

    /**
     * Extract product info from a card. Tries data-* attributes first,
     * then falls back to reading DOM elements.
     *
     * Supports the following onclick patterns on the card OR any child:
     *   goToProduct('33')
     *   checkLoginAndNavigate('33')
     *   viewProduct('33')
     *   addToBasket('33')
     *   showSellerContact('33')
     *   goToProductDetail('33')
     *   viewProductDetail('33')
     *
     * Also falls back to scanning for "rating-33" style IDs, and any
     * <a href="product-detail.html?id=33"> links.
     */
    function extractProductFromCard(card) {
        // ---- Product ID ----
        let id = card.dataset.productId;

        // Look for onclick handlers on the card OR any child element
        if (!id) {
            const candidates = [card, ...card.querySelectorAll("[onclick]")];
            const onclickPattern = /(?:goToProduct|checkLoginAndNavigate|viewProduct|viewProductDetail|goToProductDetail|addToBasket|showSellerContact|shareProductToWhatsApp)\(['"]?([^'")\s,]+)['"]?\)/;
            for (const el of candidates) {
                const onclick = el.getAttribute("onclick") || "";
                const m = onclick.match(onclickPattern);
                if (m && m[1]) {
                    id = m[1];
                    break;
                }
            }
        }

        // Fallback 1: <a href="product-detail.html?id=33">
        if (!id) {
            const link = card.querySelector('a[href*="product-detail.html"]');
            if (link) {
                try {
                    const url = new URL(link.href, window.location.origin);
                    id = url.searchParams.get("id");
                } catch (e) {}
            }
        }

        // Fallback 2: look for elements with id="rating-33" or similar patterns
        if (!id) {
            const match = (card.innerHTML || "").match(/(?:rating|product)-(\d+)/i);
            if (match) id = match[1];
        }

        // Fallback 3: any element with data-product-id / data-id
        if (!id) {
            const el = card.querySelector("[data-product-id], [data-id]");
            if (el) {
                id = el.getAttribute("data-product-id") || el.getAttribute("data-id");
            }
        }

        // ---- Title ----
        let title = card.dataset.productTitle;
        if (!title) {
            const el = card.querySelector(".product-title, .title, h3, h4, .card-title");
            title = el ? el.textContent.trim() : "Product";
        }

        // ---- Price ----
        let price = null;
        if (card.dataset.productPrice) {
            const v = parseFloat(card.dataset.productPrice);
            if (!isNaN(v)) price = v;
        }
        if (price == null) {
            const el = card.querySelector(".product-price, .price");
            if (el) {
                const txt = el.textContent.replace(/[^0-9.]/g, "");
                const v = parseFloat(txt);
                if (!isNaN(v)) price = v;
            }
        }

        // ---- Image (informational only; WhatsApp gets it from the OG tags) ----
        let image = card.dataset.productImage;
        if (!image) {
            const img = card.querySelector("img");
            image = img ? img.src : "";
        }

        return {
            id: id,
            title: title,
            price: price,
            image: image,
            seller_name: card.dataset.sellerName || null,
        };
    }

    function alreadyHasShareButton(card) {
        if (card.querySelector(".btn-whatsapp-share, .card-share-btn, .wa-share-btn")) return true;
        const btn = card.querySelector('button[onclick*="hare"]');
        return !!btn;
    }

    // ============================================
    // AUTO-INJECT SHARE BUTTON
    // ============================================

    function injectButton(card) {
        if (card.getAttribute(PROCESSED_ATTR)) return;

        // If the card already has a share button (e.g. shop.js adds one), skip.
        if (alreadyHasShareButton(card)) {
            card.setAttribute(PROCESSED_ATTR, "1");
            return;
        }

        // Don't inject if we can't determine the product ID
        const product = extractProductFromCard(card);
        if (!product.id) {
            // Don't mark as processed — MutationObserver may retry when
            // the card is fully populated.
            return;
        }

        card.setAttribute(PROCESSED_ATTR, "1");

        // Where to inject: prefer a product-actions area, else .info / .product-info, else the card
        const target =
            card.querySelector(".product-actions") ||
            card.querySelector(".card-actions") ||
            card.querySelector(".product-info") ||
            card.querySelector(".info") ||
            card;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-whatsapp-share";
        btn.title = "Share on WhatsApp";
        btn.setAttribute("aria-label", "Share on WhatsApp");
        btn.innerHTML =
            '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
            '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>' +
            '</svg>' +
            '<span class="share-label">Share</span>';

        // Stop propagation so tapping Share doesn't trigger the card's own onclick
        const stop = (e) => { if (e && e.stopPropagation) e.stopPropagation(); };
        btn.addEventListener("mousedown", stop);
        btn.addEventListener("touchstart", stop, { passive: true });

        btn.addEventListener("click", function (e) {
            stop(e);
            if (e && e.preventDefault) e.preventDefault();

            const freshProduct = extractProductFromCard(card);
            if (!freshProduct.id) {
                console.warn("[whatsapp-share] Card lost its product ID");
                return;
            }
            window.shareProductToWhatsApp(null, freshProduct);
        });

        target.appendChild(btn);
    }

    function processCards() {
        const cards = document.querySelectorAll(".product-card");
        for (let i = 0; i < cards.length; i++) {
            try {
                injectButton(cards[i]);
            } catch (e) {
                console.warn("[whatsapp-share] Failed to inject on a card:", e);
            }
        }
    }

    // ============================================
    // BOOT + WATCH FOR NEW CARDS
    // ============================================

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", processCards);
    } else {
        processCards();
    }

    // Re-run when the DOM changes (filter/sort/render).
    try {
        const observer = new MutationObserver(function (mutations) {
            let shouldProcess = false;
            for (let i = 0; i < mutations.length; i++) {
                const m = mutations[i];
                for (let j = 0; j < m.addedNodes.length; j++) {
                    const node = m.addedNodes[j];
                    if (node.nodeType !== 1) continue;
                    if (
                        (node.classList && node.classList.contains("product-card")) ||
                        (node.querySelector && node.querySelector(".product-card"))
                    ) {
                        shouldProcess = true;
                        break;
                    }
                }
                if (shouldProcess) break;
            }
            if (shouldProcess) processCards();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    } catch (e) {
        console.warn("[whatsapp-share] MutationObserver not available:", e);
    }

    // ============================================
    // PUBLIC HOOKS
    // ============================================

    // Allow pages to manually trigger a re-scan after rendering cards
    window.processWhatsAppShareButtons = processCards;

    // ============================================
    // ANALYTICS STUB
    // ============================================

    function trackAnalyticsEvent(name, payload) {
        console.log("[analytics]", name, payload);
    }
})();
