const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function scrapeBeForwardStock(make = 'toyota', page = 1) {
  const url = `https://www.beforward.jp/stocklist/make=${make}/page=${page}`;
  console.log(`Fetching primary stock from: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const vehicles = [];

    $('.make-val-box').each((index, element) => {
      const title = $(element).find('.vehicle-name').text().trim();
      const relativeUrl = $(element).find('.vehicle-name a').attr('href');
      const external_url = relativeUrl ? `https://www.beforward.jp${relativeUrl}` : null;
      const main_image = $(element).find('.vehicle-img img').attr('data-original') || $(element).find('.vehicle-img img').attr('src');
      
      const priceText = $(element).find('.price').text().replace(/[^0-9]/g, '');
      const price_usd = priceText ? parseInt(priceText, 10) : null;

      const yearText = $(element).find('.val-year').text().trim();
      const year = yearText ? parseInt(yearText, 10) : null;

      const mileage = $(element).find('.val-mileage').text().trim();
      const transmission = $(element).find('.val-trans').text().trim();

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

      if (error) throw error;
      console.log(`Successfully scraped and upserted ${data.length} vehicles from Be Forward.`);
      return data;
    }

    console.log('No vehicles found on page.');
    return [];

  } catch (err) {
    console.error('Error scraping Be Forward:', err.message);
    return [];
  }
}

// Execute scraper if run directly
if (require.main === module) {
  scrapeBeForwardStock('toyota', 1);
}

module.exports = { scrapeBeForwardStock };
