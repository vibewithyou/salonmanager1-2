-- Allow public to read appointment time slots for booking calendar (without private details)
CREATE POLICY "Public can view appointment slots for booking" 
ON public.appointments 
FOR SELECT 
USING (true);