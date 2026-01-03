-- Migration: create has_free_slot function
-- This function determines whether a salon has at least one free appointment
-- slot within a specified time range. It checks employees' work schedules
-- and existing appointments to find availability. Returns true if a free
-- slot exists, otherwise false.

CREATE OR REPLACE FUNCTION public.has_free_slot(
    p_salon_id uuid,
    p_start timestamp with time zone,
    p_end timestamp with time zone
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
    free_exists boolean;
BEGIN
    -- Look for any active employee with a work schedule that overlaps the
    -- requested time window and no conflicting appointment.
    SELECT EXISTS (
        SELECT 1
        FROM public.employees e
        JOIN public.work_schedules ws ON ws.employee_id = e.id
        WHERE e.salon_id = p_salon_id
          AND e.is_active = TRUE
          AND (
            -- Specific date schedules match the exact date
            (ws.specific_date IS NOT NULL AND ws.specific_date = p_start::date) OR
            -- Recurring weekly schedules match the day of week
            (ws.specific_date IS NULL AND extract(dow from p_start) = ws.day_of_week)
          )
          -- Ensure the work schedule overlaps with the requested time range
          AND ws.start_time <= (p_end::time)
          AND ws.end_time   >= (p_start::time)
          -- Ensure there is no appointment overlapping this time window for the employee
          AND NOT EXISTS (
              SELECT 1
              FROM public.appointments a
              WHERE a.salon_id = p_salon_id
                AND a.employee_id = e.id
                AND a.status IN ('pending', 'confirmed', 'arrived', 'completed')
                AND tstzrange(a.start_time, a.end_time, '[]') && tstzrange(p_start, p_end, '[]')
          )
    ) INTO free_exists;
    RETURN free_exists;
END;
$function$;

-- Grant execute permission to anonymous and authenticated roles so the function
-- can be called via the Supabase RPC API. Without this, clients might receive
-- permission errors when invoking the function through supabase-js.
GRANT EXECUTE ON FUNCTION public.has_free_slot(uuid, timestamp with time zone, timestamp with time zone) TO anon, authenticated;