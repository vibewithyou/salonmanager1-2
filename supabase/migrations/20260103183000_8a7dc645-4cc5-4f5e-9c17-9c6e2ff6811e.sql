-- Migration: create salons_within_radius function
-- This function returns salons within a given radius (in meters) from a latitude/longitude point.

-- Ensure the PostGIS extension is enabled (requires prior migration)

CREATE OR REPLACE FUNCTION public.salons_within_radius(
    p_lat numeric,
    p_lon numeric,
    p_radius numeric
)
RETURNS TABLE (
    id uuid,
    name text,
    address text,
    city text,
    postal_code text,
    latitude numeric,
    longitude numeric,
    distance double precision,
    rating numeric,
    reviews_count integer,
    categories text[]
)
LANGUAGE sql
STABLE
AS $function$
SELECT
    s.id,
    s.name,
    s.address,
    s.city,
    s.postal_code,
    s.latitude,
    s.longitude,
    ST_Distance(
        ST_MakePoint(s.longitude, s.latitude)::geography,
        ST_MakePoint(p_lon, p_lat)::geography
    ) AS distance,
    s.rating,
    s.reviews_count,
    s.categories
FROM public.salons s
WHERE
    s.booking_enabled = TRUE
    AND s.is_active = TRUE
    AND s.latitude IS NOT NULL
    AND s.longitude IS NOT NULL
    AND ST_DWithin(
        ST_MakePoint(s.longitude, s.latitude)::geography,
        ST_MakePoint(p_lon, p_lat)::geography,
        p_radius
    )
ORDER BY distance ASC;
$function$;

-- Grant execute permission to anonymous and authenticated roles so the function
-- can be called via the Supabase RPC API. Without this, clients might receive
-- permission errors when invoking the function through supabase-js.
GRANT EXECUTE ON FUNCTION public.salons_within_radius(numeric, numeric, numeric) TO anon, authenticated;