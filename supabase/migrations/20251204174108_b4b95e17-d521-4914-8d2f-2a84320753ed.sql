-- Create a security definer function to get employees with names for public booking
CREATE OR REPLACE FUNCTION public.get_employees_for_booking(p_salon_id uuid)
RETURNS TABLE(
  id uuid,
  salon_id uuid,
  employee_position text,
  bio text,
  is_active boolean,
  first_name text,
  last_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    e.id,
    e.salon_id,
    e.position as employee_position,
    e.bio,
    e.is_active,
    COALESCE(p.first_name, ei.first_name) as first_name,
    COALESCE(p.last_name, ei.last_name) as last_name,
    p.avatar_url
  FROM public.employees e
  LEFT JOIN public.profiles p ON p.user_id = e.user_id
  LEFT JOIN public.employee_invitations ei ON ei.employee_id = e.id
  WHERE e.salon_id = p_salon_id
    AND e.is_active = true;
$$;