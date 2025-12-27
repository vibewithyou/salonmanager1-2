-- Migration to create the customer_profiles table and add a reference
-- from appointments to customer profiles. This migration allows salons
-- to manage customer records (customer files) independently of
-- Supabase's auth.users table. Each customer profile can be linked
-- optionally to an auth user, or exist on its own for walk‑in or
-- manually added customers.

-- Create the customer_profiles table. This table stores basic
-- information about a customer along with up to five images and
-- free‑text notes written by stylists or administrators.
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL,
  -- Optional link to the auth.users table. When set, this profile
  -- corresponds to a registered user. When null, the profile is
  -- considered manually created for a non‑registered customer.
  user_id uuid,
  first_name text NOT NULL,
  last_name text NOT NULL,
  birthdate date,
  phone text,
  email text,
  address text,
  -- Array of image URLs or data URIs. Up to five entries per
  -- customer. These images are used for stylist reference (e.g.
  -- hair color, style). Null when no images are stored.
  image_urls text[],
  -- Free‑text notes written by stylists or administrators. Used to
  -- record customer preferences, formulas, special requests, etc.
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT customer_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT customer_profiles_salon_id_fkey FOREIGN KEY (salon_id)
    REFERENCES public.salons(id) ON DELETE CASCADE,
  CONSTRAINT customer_profiles_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add a reference to customer_profiles from appointments. This
-- optional column allows an appointment to be associated with a
-- customer profile (either registered or manually created). If
-- customer_profile_id is null, the appointment may still link to a
-- registered user via customer_id.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS customer_profile_id uuid;

ALTER TABLE public.appointments
  ADD CONSTRAINT IF NOT EXISTS appointments_customer_profile_id_fkey
    FOREIGN KEY (customer_profile_id) REFERENCES public.customer_profiles(id) ON DELETE SET NULL;