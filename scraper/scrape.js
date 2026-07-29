import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

// Initialize Supabase admin client using environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { keyword } = req.body;

    if (!keyword || typeof keyword !== 'string') {
        return res.status(400).json({ success: false, error: 'Keyword is required' });
    }

    try {
        const targetUrl = `https://www.beforward.jp/stocklist/keyword=${encodeURIComponent(keyword)}`;
        
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch source page. Status: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const scrapedVehicles = [];

        // Loop over each vehicle card in the search results
        $('.make-val-container, .items-box, .vehicle-card').each((index, element) => {
            // Extract title specifically from vehicle name headers/anchors
            let rawTitle = $(element).find('.vehicle-name, .title, a.title-link, .vehicle-title, h2, h3').first().text().trim();
            
            // Clean newline characters and multiple spaces
            rawTitle = rawTitle.replace(/\s+/g, ' ');

            // Strict check: Ignore bad elements where title extracted as "Mileage" or empty text
            if (!rawTitle || rawTitle.toLowerCase() === 'mileage' || rawTitle.length < 2) {
                return;
            }

            // Extract image URL
            let main_image = $(element).find('img').attr('data-original') || $(element).find('img').attr('src') || '';
            if (main_image.startsWith('//')) {
                main_image = 'https:' + main_image;
            } else if (main_image.startsWith('/')) {
                main_image = 'https://www.beforward.jp' + main_image;
            }

            // Extract listing detail link
            let external_url = $(element).find('a.vehicle-url, a.title-link, a').first().attr('href') || '';
            if (external_url.startsWith('/')) {
                external_url = 'https://www.beforward.jp' + external_url;
            }

            // Extract raw price string and extract numeric value
            const priceText = $(element).find('.price, .vehicle-price, .val-price').text().trim();
            const numericPrice = priceText.replace(/[^0-9]/g, '');

            // Extract individual vehicle specifications
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
            return res.status(200).json({ 
                success: true, 
                count: 0, 
                vehicles: [], 
                message: 'No new valid vehicles found matching keyword.' 
            });
        }

        // Insert or Update the clean records in Supabase
        const { data, error } = await supabase
            .from('vehicles')
            .upsert(scrapedVehicles, { onConflict: 'external_url' })
            .select('*');

        if (error) {
            throw error;
        }

        return res.status(200).json({
            success: true,
            count: data.length,
            vehicles: data
        });

    } catch (err) {
        console.error('Scraper Error:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'An error occurred while scraping vehicles.'
        });
    }
}
