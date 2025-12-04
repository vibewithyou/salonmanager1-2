-- Create table for pending employee invitations
CREATE TABLE public.employee_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  first_name text,
  last_name text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + interval '30 days') NOT NULL
);

-- Enable RLS
ALTER TABLE public.employee_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage invitations
CREATE POLICY "Admins can manage invitations"
ON public.employee_invitations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view invitations for their email
CREATE POLICY "Users can view own invitations"
ON public.employee_invitations
FOR SELECT
USING (lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())));

-- Create function to link employee on registration
CREATE OR REPLACE FUNCTION public.link_employee_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Check if there's a pending invitation for this email
  SELECT ei.*, e.salon_id 
  INTO invitation_record
  FROM public.employee_invitations ei
  JOIN public.employees e ON e.id = ei.employee_id
  WHERE lower(ei.email) = lower(NEW.email)
  AND ei.status = 'pending'
  AND ei.expires_at > now()
  LIMIT 1;
  
  IF FOUND THEN
    -- Link the user to the employee record
    UPDATE public.employees 
    SET user_id = NEW.id 
    WHERE id = invitation_record.employee_id;
    
    -- Update invitation status
    UPDATE public.employee_invitations 
    SET status = 'accepted' 
    WHERE id = invitation_record.id;
    
    -- Add stylist role instead of customer
    DELETE FROM public.user_roles WHERE user_id = NEW.id AND role = 'customer';
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'stylist');
    
    -- Update profile with name from invitation
    UPDATE public.profiles 
    SET first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', invitation_record.first_name),
        last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', invitation_record.last_name)
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after user signup
CREATE TRIGGER on_auth_user_created_link_employee
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_employee_on_signup();