import { supabase } from './client';
import type { Database } from './types';

/**
 * Fetch salons within a given radius of a coordinate. Requires the
 * `salons_within_radius` function to be defined in the database. Returns
 * an array of salons sorted by distance. See the corresponding SQL for
 * details on returned fields. Note: radius is in meters.
 *
 * @param lat - Latitude of the centre point
 * @param lon - Longitude of the centre point
 * @param radius - Maximum distance in meters
 */
export async function getSalonsWithinRadius(
  lat: number,
  lon: number,
  radius: number
): Promise<{
  data: Database['public']['Functions']['salons_within_radius']['Returns'] | null;
  error: any;
}> {
  const { data, error } = await supabase.rpc('salons_within_radius', {
    p_lat: lat,
    p_lon: lon,
    p_radius: radius,
  });
  return { data: data as any, error };
}

/**
 * Fetch salons within a given radius of a coordinate using server‑side filters.
 * This RPC applies optional filters for minimum rating, price range,
 * categories and availability.  If a filter value is undefined or null,
 * it is ignored. See the SQL definition of `salons_within_radius_filtered`
 * for full details.  Radius is in meters.
 *
 * @param lat - Latitude of the centre point
 * @param lon - Longitude of the centre point
 * @param radius - Maximum distance in meters
 * @param options - Optional filtering parameters
 */
export async function getSalonsWithinRadiusFiltered(
  lat: number,
  lon: number,
  radius: number,
  options: {
    minRating?: number | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    categories?: string[] | null;
    start?: string | null;
    end?: string | null;
  } = {}
): Promise<{
  data: Database['public']['Functions']['salons_within_radius_filtered']['Returns'] | null;
  error: any;
}> {
  const {
    minRating = null,
    minPrice = null,
    maxPrice = null,
    categories = null,
    start = null,
    end = null,
  } = options;
  const { data, error } = await supabase.rpc('salons_within_radius_filtered', {
    p_lat: lat,
    p_lon: lon,
    p_radius: radius,
    p_min_rating: minRating,
    p_min_price: minPrice,
    p_max_price: maxPrice,
    p_categories: categories,
    p_start: start,
    p_end: end,
  });
  return { data: data as any, error };
}

/**
 * Check if a salon has at least one free appointment slot within a time range.
 * Requires the `has_free_slot` function in the database. Returns a boolean.
 *
 * @param salonId - The UUID of the salon to check
 * @param startIso - Start timestamp in ISO format
 * @param endIso - End timestamp in ISO format
 */
export async function checkHasFreeSlot(
  salonId: string,
  startIso: string,
  endIso: string
): Promise<{ data: boolean | null; error: any }> {
  const { data, error } = await supabase.rpc('has_free_slot', {
    p_salon_id: salonId,
    p_start: startIso,
    p_end: endIso,
  });
  return { data: data as boolean | null, error };
}