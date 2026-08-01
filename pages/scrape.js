import { createClient } from '@supabase/supabase-js';
import cheerio from 'cheerio';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ success: false, error: 'Query parameter is required' });
  }

  const cleanQuery = query.trim();

  try {
    // 1. PRIMARY OPTION: Search stored stock in Supabase database
    const { data: dbVehicles, error: dbError } = await supabase
      .from('vehicles')
      .select('*')
      .ilike('title', `%${cleanQuery}%`)
      .order('created_at', { ascending: false });

    if (dbError) throw dbError;

    if (dbVehicles && dbVehicles.length > 0) {
      return res.status(200).json({
        success: true,
        source: 'database',
        vehicles: dbVehicles
      });
    }

    // 2. SECONDARY OPTION: Live scrape fallback if no database results exist
    console.log(`No local stock found for "${cleanQuery}". Initiating live search fallback...`);
    
    const searchUrl = `https://www.beforward.jp/stocklist/keyword=${encodeURIComponent(cleanQuery)}`;
    const liveResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!liveResponse.ok) {
      return res.status(200).json({ success: true, source: 'database', vehicles: [] });
    }

    const html = await liveResponse.text();
    const $ = cheerio.load(html);
    const liveVehicles = [];

    $('.make-val-box').each((_, element) => {
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
        liveVehicles.push({
          title,
          external_url,
          main_image,
          price_usd,
          year,
          mileage,
          transmission,
          source: 'beforward_live'
        });
      }
    });

    // Cache new live search results into Supabase for future requests
    if (liveVehicles.length > 0) {
      const { data: savedVehicles } = await supabase
        .from('vehicles')
        .upsert(liveVehicles, { onConflict: 'external_url' })
        .select();

      return res.status(200).json({
        success: true,
        source: 'live_search',
        vehicles: savedVehicles || liveVehicles
      });
    }

    return res.status(200).json({ success: true, source: 'live_search', vehicles: [] });

  } catch (err) {
    console.error('Search API Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
