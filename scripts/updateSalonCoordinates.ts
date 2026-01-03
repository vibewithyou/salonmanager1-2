import { createClient } from '@supabase/supabase-js';

// This script updates existing salons with geocoded coordinates, test
// ratings, review counts and categories. Run it with `ts-node` or
// compile to JavaScript. Before running, ensure you have set the
// environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.

// Note: Updating rows in Supabase requires a service role key. Do not
// expose this key in client-side code. This script is intended to be
// executed in a secure backend environment.

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Geocode an address using the OpenStreetMap Nominatim API. Returns null
 * when no coordinates are found. Note that Nominatim has rate limits; for
 * production use consider caching or a paid geocoding service.
 */
async function geocode(address: string): Promise<{ latitude: number; longitude: number } | null> {
  const params = new URLSearchParams({ q: address, format: 'json', limit: '1' });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  const data = (await response.json()) as any[];
  if (data && data.length > 0) {
    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };
  }
  return null;
}

async function updateSalons() {
  const { data: salons, error } = await supabase
    .from('salons')
    .select('id, address, city, postal_code');

  if (error) {
    throw error;
  }

  for (const salon of salons as any[]) {
    const fullAddress = `${salon.address || ''}, ${salon.postal_code || ''} ${salon.city || ''}`;
    let coords: { latitude: number; longitude: number } | null = null;
    try {
      coords = await geocode(fullAddress);
    } catch (err) {
      console.warn(`Failed to geocode ${fullAddress}:`, err);
    }

    // Generate test rating between 3.0 and 5.0 with one decimal place
    const rating = Math.round((Math.random() * 2 + 3) * 10) / 10;
    // Generate test review count between 0 and 100
    const reviews_count = Math.floor(Math.random() * 101);
    // Example categories. Adjust as needed.
    const categories = ['Herrenfriseur', 'Balayage', 'Barbier'];

    await supabase
      .from('salons')
      .update({
        latitude: coords ? coords.latitude : null,
        longitude: coords ? coords.longitude : null,
        rating,
        reviews_count,
        categories,
      })
      .eq('id', salon.id);

    console.log(`Updated salon ${salon.id}`);
  }
  console.log('Salon updates complete');
}

updateSalons().catch((err) => {
  console.error('Error updating salons:', err);
});