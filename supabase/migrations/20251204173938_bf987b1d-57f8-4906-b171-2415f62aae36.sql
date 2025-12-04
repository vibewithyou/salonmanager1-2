-- Fix salons table: Remove sensitive columns from public view
-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Public can view basic salon info" ON public.salons;

-- Create a stricter policy that only allows public viewing without sensitive data
-- Public users should use get_public_salons() function instead
CREATE POLICY "Authenticated users can view salons"
ON public.salons
FOR SELECT
USING (
  is_active = true
  AND (
    -- Admins see all
    has_role(auth.uid(), 'admin')
    -- Owners see their salon
    OR owner_id = auth.uid()
    -- Employees see their salon
    OR EXISTS (
      SELECT 1 FROM employees e 
      WHERE e.salon_id = salons.id AND e.user_id = auth.uid()
    )
    -- Authenticated customers can view (but should use function for booking)
    OR auth.uid() IS NOT NULL
  )
);

-- For anonymous/public access, only allow via the security definer function
-- The function get_public_salons() already excludes sensitive fields

-- Fix appointments: Ensure only authorized users can see guest data
-- Current policies already restrict to admin/employees/customer-owner
-- But we need to make sure the public view doesn't expose PII

-- The appointments table policies are already restrictive
-- Update the appointment_slots view to ensure it doesn't join sensitive data
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
FROM public.appointments a
WHERE a.status != 'cancelled';

GRANT SELECT ON public.appointment_slots TO anon, authenticated;