const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate Environment Variables early
if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const TARGET_URL = 'https://www.beforward.jp/stocklist/page=1/';

async function runScraper() {
    console.log('Starting vehicle scraper...');

    try {
        const { data } = await axios.get(TARGET_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 15000
        });

        const $ = cheerio.load(data);
        const vehicles = [];

        $('.stocklist-row').each((index, element) => {
            const title = $(element).find('.vehicle-title').text().trim();
            const rawPrice = $(element).find('.price-value').text().trim();
            const price_usd = parseInt(rawPrice.replace(/[^0-9]/g, '')) || 0;
            const year = parseInt($(element).find('.year-spec').text().trim()) || null;
            const mileage = $(element).find('.mileage-spec').text().trim() || 'N/A';
            const transmission = $(element).find('.trans-spec').text().trim() || 'Automatic';
            const main_image = $(element).find('img.vehicle-img').attr('src') || $(element).find('img.vehicle-img').attr('data-src');
            const external_url = $(element).find('a.vehicle-link').attr('href');

            if (title && price_usd > 0 && external_url) {
                vehicles.push({
                    title,
                    price_usd,
                    listing_source: 'import_japan',
                    year,
                    mileage,
                    transmission,
                    main_image,
                    external_url,
                    created_at: new Date().toISOString()
                });
            }
        });

        console.log(`Parsed ${vehicles.length} vehicle listings.`);

        if (vehicles.length > 0) {
            const { error } = await supabase
                .from('vehicles')
                .upsert(vehicles, { onConflict: 'external_url' });

            if (error) {
                console.error('Supabase Sync Error:', error.message);
                process.exit(1);
            } else {
                console.log(`Successfully synced ${vehicles.length} vehicles to Supabase!`);
            }
        } else {
            console.warn('No vehicles found on page. DOM structure may have changed.');
        }

    } catch (err) {
        console.error('Scraper Execution Failed:', err.message);
        process.exit(1);
    }
}

runScraper();
