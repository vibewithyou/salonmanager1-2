-- Add public read policy for employee_invitations (only names, for booking display)
CREATE POLICY "Public can view employee invitation names" 
ON public.employee_invitations 
FOR SELECT 
USING (true);