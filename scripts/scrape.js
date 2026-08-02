const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client using environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function scrapeBeForward(make = 'toyota', pages = 1) {
  console.log(`Starting scrape for make: ${make} (${pages} page(s))...`);

  for (let page = 1; page <= pages; page++) {
    const url = `https://www.beforward.jp/stocklist/make=${make}/page=${page}`;
    console.log(`Fetching page ${page}: ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch page ${page}, status: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const vehicles = [];

      $('.make-val-box').each((_, element) => {
        const title = $(element).find('.vehicle-name').text().trim();
        const relativeUrl = $(element).find('.vehicle-name a').attr('href');
        const external_url = relativeUrl ? `https://www.beforward.jp${relativeUrl}` : null;
        
        const main_image = $(element).find('.vehicle-img img').attr('data-original') 
          || $(element).find('.vehicle-img img').attr('src');

        const rawPrice = $(element).find('.price').text().replace(/[^0-9]/g, '');
        const price_usd = rawPrice ? parseInt(rawPrice, 10) : null;

        const rawYear = $(element).find('.val-year').text().trim();
        const year = rawYear ? parseInt(rawYear, 10) : null;

        const mileage = $(element).find('.val-mileage').text().trim() || null;
        const transmission = $(element).find('.val-trans').text().trim() || null;

        if (title && external_url) {
          vehicles.push({
            title,
            external_url,
            main_image,
            price_usd,
            year,
            mileage,
            transmission,
            source: 'beforward'
          });
        }
      });

      if (vehicles.length > 0) {
        const { data, error } = await supabase
          .from('vehicles')
          .upsert(vehicles, { onConflict: 'external_url' })
          .select();

        if (error) {
          console.error(`Error saving page ${page} to database:`, error.message);
        } else {
          console.log(`Successfully processed ${data.length} vehicles from page ${page}.`);
        }
      } else {
        console.log(`No vehicle items found on page ${page}.`);
      }

    } catch (err) {
      console.error(`Scrape failed on page ${page}:`, err.message);
    }
  }

  console.log('Scrape run completed.');
}

// Run when executed directly
if (require.main === module) {
  scrapeBeForward('toyota', 2);
}

module.exports = { scrapeBeForward };
