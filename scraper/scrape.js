const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    realtime: { timeout: 0 }
});

// BASE URL for Japanese stock list
const BASE_URL = 'https://www.beforward.jp/stocklist/page=';
const PAGES_TO_SCRAPE = 4; // 4 pages * ~25-30 cars = 100-120 cars

async function runScraper() {
    console.log(`Launching Puppeteer headless browser to scrape ${PAGES_TO_SCRAPE} pages (~100 vehicles)...`);

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

    const allScrapedVehicles = [];

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/122.0.0.0 Safari/537.36');

        for (let pageNum = 1; pageNum <= PAGES_TO_SCRAPE; pageNum++) {
            const targetUrl = `${BASE_URL}${pageNum}`;
            console.log(`[Page ${pageNum}/${PAGES_TO_SCRAPE}] Navigating to ${targetUrl}...`);

            await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            await page.waitForSelector('.stocklist-row, tr.stocklist-row, .vehicle-card', { timeout: 15000 })
                .catch(() => console.log(`[Page ${pageNum}] Selector timeout reached, processing current DOM...`));

            const pageVehicles = await page.evaluate(() => {
                const items = [];
                const rows = document.querySelectorAll('.stocklist-row, tr.stocklist-row, .vehicle-card');

                rows.forEach(row => {
                    const titleEl = row.querySelector('.vehicle-title, .title, .make-val, a.vehicle-url-title');
                    const title = titleEl ? titleEl.innerText.trim().replace(/\s+/g, ' ') : null;

                    const priceEl = row.querySelector('.price-value, .fob-price, span[class*="price"], .price');
                    const rawPrice = priceEl ? priceEl.innerText.trim() : '0';
                    const price_usd = parseInt(rawPrice.replace(/[^0-9]/g, '')) || 0;

                    const yearEl = row.querySelector('.year, .registration-year');
                    const year = yearEl ? (parseInt(yearEl.innerText.replace(/[^0-9]/g, '')) || 2016) : 2016;

                    const mileageEl = row.querySelector('.mileage, .mileage-spec');
                    const mileage = mileageEl ? mileageEl.innerText.trim() : 'N/A';

                    const transEl = row.querySelector('.trans, .transmission');
                    const transmission = transEl ? transEl.innerText.trim() : 'Automatic';

                    const imgEl = row.querySelector('img.vehicle-img, img');
                    let main_image = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-original')) : null;
                    if (main_image && main_image.startsWith('//')) main_image = 'https:' + main_image;

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

            console.log(`[Page ${pageNum}] Extracted ${pageVehicles.length} vehicles.`);
            allScrapedVehicles.push(...pageVehicles);
        }

        console.log(`Total extracted across all pages: ${allScrapedVehicles.length} vehicles.`);

        if (allScrapedVehicles.length > 0) {
            // Deduplicate batch using external_url
            const uniqueVehicles = Array.from(
                new Map(allScrapedVehicles.map(v => [v.external_url, v])).values()
            );

            console.log(`Pushing ${uniqueVehicles.length} unique records to Supabase...`);

            const { error } = await supabase
                .from('vehicles')
                .upsert(uniqueVehicles, { onConflict: 'external_url' });

            if (error) {
                console.error('Supabase Upsert Error:', error.message);
                process.exit(1);
            } else {
                console.log(`Success! Upserted ${uniqueVehicles.length} vehicles into Supabase.`);
            }
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
