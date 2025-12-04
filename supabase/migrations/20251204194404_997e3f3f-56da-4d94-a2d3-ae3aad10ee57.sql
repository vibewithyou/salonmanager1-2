-- Create a secure function to handle salon creation with role upgrade
CREATE OR REPLACE FUNCTION public.create_salon_with_owner(
  p_name text,
  p_description text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_postal_code text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_opening_hours jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_salon_id uuid;
BEGIN
  -- Get the current user's ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if user already has a salon
  IF EXISTS (SELECT 1 FROM salons WHERE owner_id = v_user_id) THEN
    RAISE EXCEPTION 'User already owns a salon';
  END IF;

  -- Create the salon
  INSERT INTO salons (name, description, address, city, postal_code, phone, email, owner_id, opening_hours, is_active)
  VALUES (p_name, p_description, p_address, p_city, p_postal_code, p_phone, p_email, v_user_id, p_opening_hours, true)
  RETURNING id INTO v_salon_id;

  -- Update user role to admin
  UPDATE user_roles 
  SET role = 'admin' 
  WHERE user_id = v_user_id;

  -- Create the owner as an employee
  INSERT INTO employees (salon_id, user_id, position, is_active, display_name)
  VALUES (v_salon_id, v_user_id, 'Inhaber', true, 'Inhaber');

  RETURN v_salon_id;
END;
$$;