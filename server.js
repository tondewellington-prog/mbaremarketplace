// server.js
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Utility to ensure broken/dead CDN domains are corrected
function sanitizeImageUrl(url) {
    if (!url) return 'https://via.placeholder.com/400x250?text=No+Image';
    let cleaned = url.replace('bf-images.beforward.jp', 'cdn.beforward.jp');
    if (cleaned.startsWith('//')) {
        cleaned = 'https:' + cleaned;
    }
    return cleaned;
}

app.post('/api/search-and-scrape-japan', async (req, res) => {
    const { keyword } = req.body;

    if (!keyword || keyword.trim() === '') {
        return res.status(400).json({ success: false, error: 'Please enter a search term.' });
    }

    try {
        // Construct the Be Forward stocklist search URL
        const searchUrl = `https://www.beforward.jp/stocklist/keyword=${encodeURIComponent(keyword)}`;

        // Fetch live HTML from source
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const scrapedCars = [];

        // Loop through each vehicle box on the search result page
        $('.stocklist-row, .make-val-container, tr.bev-stocklist-item').each((i, element) => {
            if (i >= 12) return false; // Limit to top 12 results per search for performance

            const title = $(element).find('.vehicle-name, .title, a.title-link').text().trim();
            const price = $(element).find('.price, .total-price').first().text().trim();
            const relLink = $(element).find('a.title-link, a').attr('href');
            
            let rawImg = $(element).find('img.stock-list-image, img').attr('src') || 
                         $(element).find('img.stock-list-image, img').attr('data-src');

            if (title && relLink) {
                const fullLink = relLink.startsWith('http') ? relLink : `https://www.beforward.jp${relLink}`;
                const cleanImg = sanitizeImageUrl(rawImg);

                scrapedCars.push({
                    title: title,
                    price: price || 'Contact for Price',
                    original_url: fullLink,
                    image_url: cleanImg,
                    category: 'japan-imports',
                    created_at: new Date().toISOString()
                });
            }
        });

        if (scrapedCars.length === 0) {
            return res.json({ success: true, count: 0, vehicles: [] });
        }

        // Save / Upsert scraped vehicles into Supabase
        const { data: savedVehicles, error: dbError } = await supabase
            .from('japan_imports')
            .upsert(scrapedCars, { onConflict: 'original_url' })
            .select();

        if (dbError) {
            console.error('Database Upsert Error:', dbError);
            // Fall back to returning scraped list even if DB insert fails
            return res.json({ success: true, count: scrapedCars.length, vehicles: scrapedCars });
        }

        return res.json({ success: true, count: savedVehicles.length, vehicles: savedVehicles });

    } catch (error) {
        console.error('Search Scrape Error:', error.message);
        return res.status(500).json({ success: false, error: 'Failed to search and scrape vehicles.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Search Engine running on port ${PORT}`));
