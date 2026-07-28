const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Public stock list URL
const TARGET_URL = 'https://www.beforward.jp/stocklist';

async function runScraper() {
    console.log('Launching Puppeteer headless browser...');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    });

    try {
        const page = await browser.newPage();

        // Set high-resolution desktop viewport and real browser headers
        await page.setViewport({ width: 1440, height: 900 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/122.0.0.0 Safari/537.36');

        console.log(`Navigating to ${TARGET_URL}...`);
        await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait up to 15 seconds for vehicle listing cards to render in the browser DOM
        await page.waitForSelector('.stocklist-row, tr.stocklist-row, .vehicle-card, .make-val', { timeout: 15000 })
            .catch(() => console.log('Selector timeout reached. Proceeding with DOM evaluation...'));

        // Extract vehicles directly inside browser execution context
        const vehicles = await page.evaluate(() => {
            const items = [];
            
            // Query all possible table rows or grid cards containing vehicles
            const rows = document.querySelectorAll('.stocklist-row, tr.stocklist-row, .vehicle-card');

            rows.forEach(row => {
                // Extract Title
                const titleEl = row.querySelector('.vehicle-title, .title, .make-val, a.vehicle-url-title');
                const title = titleEl ? titleEl.innerText.trim().replace(/\s+/g, ' ') : null;

                // Extract Price
                const priceEl = row.querySelector('.price-value, .fob-price, span[class*="price"], .price');
                const rawPrice = priceEl ? priceEl.innerText.trim() : '0';
                const price_usd = parseInt(rawPrice.replace(/[^0-9]/g, '')) || 0;

                // Extract Specs
                const yearEl = row.querySelector('.year, .registration-year');
                const year = yearEl ? (parseInt(yearEl.innerText.replace(/[^0-9]/g, '')) || 2016) : 2016;

                const mileageEl = row.querySelector('.mileage, .mileage-spec');
                const mileage = mileageEl ? mileageEl.innerText.trim() : 'N/A';

                const transEl = row.querySelector('.trans, .transmission');
                const transmission = transEl ? transEl.innerText.trim() : 'Automatic';

                // Extract Image
                const imgEl = row.querySelector('img.vehicle-img, img');
                let main_image = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-original')) : null;
                if (main_image && main_image.startsWith('//')) {
                    main_image = 'https:' + main_image;
                }

                // Extract Link URL
                const linkEl = row.querySelector('a.vehicle-url-title, a[href*="/beforward/"], a');
                let external_url = linkEl ? linkEl.getAttribute('href') : null;
                if (external_url && !external_url.startsWith('http')) {
                    external_url = 'https://www.beforward.jp' + external_url;
                }

                if (title && price_usd > 0 && external_url) {
                    items.push({
                        title,
                        price_usd,
                        listing_source: 'import_japan',
                        year,
                        mileage,
                        transmission,
                        main_image: main_image || 'https://via.placeholder.com/300x200?text=No+Image',
                        external_url,
                        created_at: new Date().toISOString()
                    });
                }
            });

            return items;
        });

        console.log(`Successfully extracted ${vehicles.length} vehicle listings.`);

        if (vehicles.length > 0) {
            console.log('Pushing extracted items to Supabase database...');
            
            // Upsert array to Supabase using external_url as conflict target
            const { data, error } = await supabase
                .from('vehicles')
                .upsert(vehicles, { onConflict: 'external_url' });

            if (error) {
                console.error('Supabase Upsert Error:', error.message);
                process.exit(1);
            } else {
                console.log(`Success! Upserted ${vehicles.length} vehicle records into Supabase.`);
            }
        } else {
            console.warn('WARNING: 0 vehicles extracted. Check if page layout or URL structure has updated.');
        }

    } catch (err) {
        console.error('Scraper Execution Failed:', err.message);
        process.exit(1);
    } finally {
        await browser.close();
        console.log('Browser closed cleanly.');
    }
}

runScraper();
