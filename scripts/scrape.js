const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Pause execution between requests to avoid getting IP-blocked
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function scrapeStocklistPages(maxPages = 5) {
  const allVehicles = [];

  for (let page = 1; page <= maxPages; page++) {
    // General stocklist URL across all makes, sorted by newest arrivals
    const targetUrl = `https://www.beforward.jp/stocklist/page=${page}/sortkey=n`;
    console.log(`[${page}/${maxPages}] Fetching page: ${targetUrl}`);

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        console.error(`Failed to load page ${page}, HTTP status: ${response.status}`);
        continue;
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      let pageCount = 0;

      $('.make-val-box').each((_, element) => {
        const title = $(element).find('.vehicle-name').text().trim();
        const relativeUrl = $(element).find('.vehicle-name a').attr('href');
        const external_url = relativeUrl ? `https://www.beforward.jp${relativeUrl}` : null;

        const main_image =
          $(element).find('.vehicle-img img').attr('data-original') ||
          $(element).find('.vehicle-img img').attr('src');

        const rawPrice = $(element).find('.price').text().replace(/[^0-9]/g, '');
        const price_usd = rawPrice ? parseInt(rawPrice, 10) : null;

        const rawYear = $(element).find('.val-year').text().trim();
        const year = rawYear ? parseInt(rawYear, 10) : null;

        const mileage = $(element).find('.val-mileage').text().trim() || null;
        const transmission = $(element).find('.val-trans').text().trim() || null;

        if (title && external_url) {
          allVehicles.push({
            title,
            external_url,
            main_image,
            price_usd,
            year,
            mileage,
            transmission,
            source: 'beforward'
          });
          pageCount++;
        }
      });

      console.log(`Found ${pageCount} vehicles on page ${page}.`);

      // Respectful delay before fetching the next page
      if (page < maxPages) {
        await sleep(2000);
      }
    } catch (err) {
      console.error(`Error scraping page ${page}:`, err.message);
    }
  }

  return allVehicles;
}

async function runScraper() {
  console.log('Starting general stocklist scraper (5 Pages)...');

  const scrapedCars = await scrapeStocklistPages(5);
  console.log(`Total scraped across all pages: ${scrapedCars.length} vehicles.`);

  if (scrapedCars.length === 0) {
    console.log('No vehicles extracted. Exiting.');
    return;
  }

  // Upsert into Supabase matching your vehicles table structure
  const { data, error } = await supabase
    .from('vehicles')
    .upsert(scrapedCars, { onConflict: 'external_url' })
    .select();

  if (error) {
    console.error('Error saving data to Supabase:', error.message);
    process.exit(1);
  }

  console.log(`Successfully saved/updated ${data.length} vehicles in Supabase!`);
}

runScraper();
