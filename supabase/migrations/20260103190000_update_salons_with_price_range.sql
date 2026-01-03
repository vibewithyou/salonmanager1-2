-- Migration: update salons_within_radius function to include price range
-- This migration extends the existing salons_within_radius function so that it
-- returns the minimum and maximum service price (min_price and max_price) for
-- each salon. A left join on services is used so that salons without any
-- services will return NULL for both values. The function signature remains
-- the same; only the return columns are extended and the query is adjusted.

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
    categories text[],
    min_price numeric,
    max_price numeric
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
    s.categories,
    -- Use COALESCE to return NULL when no services exist for a salon
    COALESCE(MIN(sv.price), NULL) AS min_price,
    COALESCE(MAX(sv.price), NULL) AS max_price
FROM public.salons s
    LEFT JOIN public.services sv ON sv.salon_id = s.id AND sv.is_active = TRUE
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
GROUP BY
    s.id,
    s.name,
    s.address,
    s.city,
    s.postal_code,
    s.latitude,
    s.longitude,
    s.rating,
    s.reviews_count,
    s.categories
ORDER BY distance ASC;
$function$;

-- Refresh permissions: ensure anon and authenticated can execute the updated function
GRANT EXECUTE ON FUNCTION public.salons_within_radius(numeric, numeric, numeric) TO anon, authenticated;