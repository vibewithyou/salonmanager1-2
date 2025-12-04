-- Add display_name column to employees table
ALTER TABLE public.employees 
ADD COLUMN display_name text;

-- Update existing employees with their names from profiles or invitations
UPDATE public.employees e
SET display_name = COALESCE(
  (SELECT CONCAT(p.first_name, ' ', p.last_name) FROM public.profiles p WHERE p.user_id = e.user_id),
  (SELECT CONCAT(ei.first_name, ' ', ei.last_name) FROM public.employee_invitations ei WHERE ei.employee_id = e.id),
  'Stylist'
);

-- Make sure the column is always filled for new employees
ALTER TABLE public.employees 
ALTER COLUMN display_name SET DEFAULT 'Stylist';