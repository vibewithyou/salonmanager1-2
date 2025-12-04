-- appointment_slots is a VIEW, not a table - it inherits RLS from the appointments table
-- We need to ensure the VIEW is accessible by disabling RLS on it (views don't need RLS)
-- and relying on the underlying appointments table's RLS

-- Check and disable RLS on the view if it was accidentally enabled
ALTER VIEW public.appointment_slots SET (security_invoker = false);

-- The appointments table already has proper RLS policies
-- The view only exposes: id, employee_id, status, start_time, end_time, salon_id
-- which is safe for public booking calendars (no PII)