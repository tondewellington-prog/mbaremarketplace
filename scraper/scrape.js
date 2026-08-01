import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function scrapeJapanVehicles(keyword = 'Toyota') {
    try {
        console.log(`Starting live scrape for keyword: "${keyword}"...`);
        const targetUrl = `https://www.beforward.jp/stocklist/keyword=${encodeURIComponent(keyword)}`;

        // Full browser header suite to bypass basic bot blocking
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webkit,*/;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.beforward.jp/',
                'Cache-Control': 'no-cache'
            }
        });

        console.log(`HTTP Status: ${response.status}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch target page. HTTP Status: ${response.status}`);
        }

        const html = await response.text();
        console.log(`HTML Payload Size: ${html.length} bytes`);

        const $ = cheerio.load(html);
        const scrapedVehicles = [];

        // Match table rows, cards, and items containers dynamically
        $('.stocklist-row, .stock-card, tr[class*="stocklist"], .make-val-container, .items-box, tr.stock-item').each((index, element) => {
            // Extract title specifically from vehicle name headers/anchors
            let rawTitle = $(element).find('a.vehicle-title, a[class*="title"], .vehicle-name, .title, a[class*="vehicle"]').first().text().trim();
            
            if (!rawTitle) {
                rawTitle = $(element).find('h2, h3, .make-val-title').first().text().trim();
            }

            // Standardize spaces
            rawTitle = rawTitle.replace(/\s+/g, ' ');

            // Strict check: Ignore bad elements where title extracted as "Mileage" or empty text
            if (!rawTitle || rawTitle.toLowerCase() === 'mileage' || rawTitle.length < 3) {
                return;
            }

            // Extract image URL
            let main_image = $(element).find('img.vehicle-img, img[data-original], img[src*="beforward"], img').first().attr('data-original') 
                          || $(element).find('img').first().attr('src') 
                          || '';
                          
            if (main_image.startsWith('//')) {
                main_image = 'https:' + main_image;
            } else if (main_image.startsWith('/')) {
                main_image = 'https://www.beforward.jp' + main_image;
            }

            // Extract detail page URL
            let external_url = $(element).find('a.vehicle-title, a[href*="/stocklist/"], a').first().attr('href') || '';
            if (external_url.startsWith('/')) {
                external_url = 'https://www.beforward.jp' + external_url;
            }

            // Extract numeric price
            const priceText = $(element).find('.price, .ip-price, .vehicle-price, [class*="price"]').text().trim();
            const numericPrice = priceText.replace(/[^0-9]/g, '');

            // Specs parsing
            const yearText = $(element).find('.year, [class*="year"]').text().trim();
            const transText = $(element).find('.trans, [class*="trans"]').text().trim();
            const mileageText = $(element).find('.mileage, [class*="mileage"]').text().trim();

            scrapedVehicles.push({
                title: rawTitle,
                main_image: main_image || null,
                external_url: external_url || null,
                price_usd: numericPrice ? parseInt(numericPrice, 10) : null,
                year: yearText || null,
                transmission: transText || null,
                mileage: mileageText || null,
                listing_source: 'japan_import',
                created_at: new Date().toISOString()
            });
        });

        if (scrapedVehicles.length === 0) {
            console.log('No valid vehicle records extracted. BeForward may have altered layout structure.');
            return;
        }

        console.log(`Extracted ${scrapedVehicles.length} clean vehicle records! Saving to Supabase...`);

        const { data, error } = await supabase
            .from('vehicles')
            .upsert(scrapedVehicles, { onConflict: 'external_url' })
            .select('*');

        if (error) {
            throw error;
        }

        console.log(`Successfully saved ${data.length} vehicles to Supabase!`);
    } catch (err) {
        console.error('Scraper Execution Error:', err.message || err);
        process.exit(1);
    }
}

// Allow dynamic command-line arguments (e.g. node scrape.js Honda)
const keywordArg = process.argv[2] || 'Toyota';
scrapeJapanVehicles(keywordArg);
