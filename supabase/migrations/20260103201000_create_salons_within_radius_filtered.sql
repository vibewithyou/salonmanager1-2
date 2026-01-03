-- Migration: create salons_within_radius_filtered function
-- This function extends salons_within_radius by adding optional filter
-- parameters for minimum rating, price range, categories, and available
-- time frame.  It returns salons within the given radius that satisfy all
-- provided filters and orders them by distance.

CREATE OR REPLACE FUNCTION public.salons_within_radius_filtered(
    p_lat numeric,
    p_lon numeric,
    p_radius numeric,
    p_min_rating numeric DEFAULT NULL,
    p_min_price numeric DEFAULT NULL,
    p_max_price numeric DEFAULT NULL,
    p_categories text[] DEFAULT NULL,
    p_start timestamp with time zone DEFAULT NULL,
    p_end timestamp with time zone DEFAULT NULL
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
    -- Rating filter: if p_min_rating is provided, ensure salon rating >= p_min_rating
    AND (p_min_rating IS NULL OR s.rating IS NOT NULL AND s.rating >= p_min_rating)
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
HAVING
    -- Price filter: use aggregated min and max price; if no price info, treat as passing when no filter
    (p_min_price IS NULL OR COALESCE(MIN(sv.price), NULL) IS NULL OR COALESCE(MIN(sv.price), NULL) >= p_min_price)
    AND (p_max_price IS NULL OR COALESCE(MAX(sv.price), NULL) IS NULL OR COALESCE(MAX(sv.price), NULL) <= p_max_price)
    -- Categories filter: if p_categories is provided and not empty, ensure at least one of the
    -- aggregated categories intersects with p_categories.  We reconstruct the aggregated
    -- category array here to use the same logic as in the SELECT list.
    AND (
        p_categories IS NULL
        OR array_length(p_categories, 1) = 0
        OR (
            array_remove(
                array_cat(
                    COALESCE(s.categories, ARRAY[]::text[]),
                    ARRAY_AGG(DISTINCT sv.category)
                ),
                NULL
            ) && p_categories
        )
    )
    -- Time frame filter: if both p_start and p_end are provided, only include
    -- salons that have at least one free slot in that interval according to
    -- the has_free_slot function.  Otherwise this condition is ignored.
    AND (
        p_start IS NULL
        OR p_end IS NULL
        OR has_free_slot(s.id, p_start, p_end)
    )
ORDER BY distance ASC;
$function$;

-- Grant permissions to allow clients to execute this RPC
GRANT EXECUTE ON FUNCTION public.salons_within_radius_filtered(
    numeric,
    numeric,
    numeric,
    numeric,
    numeric,
    numeric,
    text[],
    timestamp with time zone,
    timestamp with time zone
) TO anon, authenticated;