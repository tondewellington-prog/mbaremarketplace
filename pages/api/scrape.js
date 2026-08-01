import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ message: 'A valid search query is required' });
  }

  const cleanQuery = query.trim();

  try {
    // Construct target URL using mobile stocklist path format
    const targetUrl = `https://sp.beforward.jp/stocklist/keyword=${encodeURIComponent(cleanQuery)}`;

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://sp.beforward.jp/'
      }
    });

    if (!response.ok) {
      throw new Error(`BeForward fetch failed with status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const scrapedVehicles = [];

    // Target rows and vehicle card containers across standard/mobile layouts
    $('.stocklist-row, .stock-card, tr[class*="stocklist"], .make-val-container, .items-box, tr.stock-item, .vehicle-card').each((_, element) => {
      let rawTitle = $(element)
        .find('a.vehicle-title, a[class*="title"], .vehicle-name, .title, a[class*="vehicle"]')
        .first()
        .text()
        .trim();

      if (!rawTitle) {
        rawTitle = $(element).find('h2, h3, .make-val-title').first().text().trim();
      }

      rawTitle = rawTitle.replace(/\s+/g, ' ');

      if (!rawTitle || rawTitle.toLowerCase() === 'mileage' || rawTitle.length < 3) {
        return;
      }

      // Extract Vehicle Image
      let main_image = $(element).find('img.vehicle-img, img[data-original], img[data-src], img[src*="beforward"], img').first().attr('data-original') 
                    || $(element).find('img').first().attr('data-src')
                    || $(element).find('img').first().attr('src') 
                    || '';

      if (main_image.startsWith('//')) {
        main_image = 'https:' + main_image;
      } else if (main_image.startsWith('/')) {
        main_image = 'https://www.beforward.jp' + main_image;
      }

      // Extract Listing Link
      let external_url = $(element).find('a.vehicle-title, a[href*="/stocklist/"], a').first().attr('href') || '';
      if (external_url.startsWith('/')) {
        external_url = 'https://www.beforward.jp' + external_url;
      }

      // Extract Price & Specs
      const priceText = $(element).find('.price, .ip-price, .vehicle-price, [class*="price"]').text().trim();
      const numericPrice = priceText.replace(/[^0-9]/g, '');

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

    // Save/Update records in Supabase
    if (scrapedVehicles.length > 0) {
      const { data, error } = await supabase
        .from('vehicles')
        .upsert(scrapedVehicles, { onConflict: 'external_url' })
        .select('*');

      if (error) throw error;

      return res.status(200).json({ success: true, count: data.length, vehicles: data });
    }

    // Fallback: Return matching stored items if live scrape returns 0 results
    const { data: fallbackData } = await supabase
      .from('vehicles')
      .select('*')
      .ilike('title', `%${cleanQuery}%`);

    return res.status(200).json({ success: true, count: fallbackData.length, vehicles: fallbackData });

  } catch (err) {
    console.error('API Scrape Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
