-- Migration: enhance salons_within_radius to aggregate service categories
-- This migration drops the existing salons_within_radius function and
-- recreates it so that the `categories` column aggregates distinct
-- categories from both the salons.categories array and the associated
-- services.category values. It also retains min_price and max_price.

DROP FUNCTION IF EXISTS public.salons_within_radius(numeric, numeric, numeric);

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
    -- Combine salon.categories with distinct service categories and remove nulls
    COALESCE(
        array_remove(
            array_cat(
                COALESCE(s.categories, ARRAY[]::text[]),
                ARRAY_AGG(DISTINCT sv.category)
            ),
            NULL
        ),
        ARRAY[]::text[]
    ) AS categories,
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

-- Grant execution rights to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.salons_within_radius(numeric, numeric, numeric) TO anon, authenticated;