-- Fix Security Definer View warning
-- Recreate appointment_slots view with security_invoker = true (safer default)
DROP VIEW IF EXISTS public.appointment_slots;

CREATE VIEW public.appointment_slots 
WITH (security_invoker = true)
AS
SELECT 
  a.id,
  a.salon_id,
  a.employee_id,
  a.start_time,
  a.end_time,
  a.status
FROM public.appointments a;

-- Grant access to the view
GRANT SELECT ON public.appointment_slots TO anon, authenticated;