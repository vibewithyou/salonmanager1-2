-- Add buffer time columns to services table
ALTER TABLE public.services 
ADD COLUMN buffer_before integer DEFAULT 0,
ADD COLUMN buffer_after integer DEFAULT 0;

COMMENT ON COLUMN public.services.buffer_before IS 'Buffer time in minutes before appointment';
COMMENT ON COLUMN public.services.buffer_after IS 'Buffer time in minutes after appointment';