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

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch target page. HTTP Status: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const scrapedVehicles = [];

        $('.make-val-container, .items-box, .vehicle-card').each((index, element) => {
            let rawTitle = $(element).find('.vehicle-name, .title, a.title-link, .vehicle-title, h2, h3').first().text().trim();
            rawTitle = rawTitle.replace(/\s+/g, ' ');

            if (!rawTitle || rawTitle.toLowerCase() === 'mileage' || rawTitle.length < 2) {
                return;
            }

            let main_image = $(element).find('img').attr('data-original') || $(element).find('img').attr('src') || '';
            if (main_image.startsWith('//')) {
                main_image = 'https:' + main_image;
            } else if (main_image.startsWith('/')) {
                main_image = 'https://www.beforward.jp' + main_image;
            }

            let external_url = $(element).find('a.vehicle-url, a.title-link, a').first().attr('href') || '';
            if (external_url.startsWith('/')) {
                external_url = 'https://www.beforward.jp' + external_url;
            }

            const priceText = $(element).find('.price, .vehicle-price, .val-price').text().trim();
            const numericPrice = priceText.replace(/[^0-9]/g, '');

            const yearText = $(element).find('.year, .val-year, .spec-year').text().trim();
            const transText = $(element).find('.trans, .val-trans, .spec-trans').text().trim();
            const mileageText = $(element).find('.mileage, .val-mileage, .spec-mileage').text().trim();

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
            console.log('No valid vehicle records extracted.');
            return;
        }

        console.log(`Extracted ${scrapedVehicles.length} vehicles. Inserting into Supabase...`);

        const { data, error } = await supabase
            .from('vehicles')
            .upsert(scrapedVehicles, { onConflict: 'external_url' })
            .select('*');

        if (error) {
            throw error;
        }

        console.log(`Successfully saved ${data.length} vehicles to database.`);
    } catch (err) {
        console.error('Scraper Execution Error:', err.message || err);
        process.exit(1);
    }
}

scrapeJapanVehicles('Toyota');
