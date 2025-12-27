-- Migration to add consent fields to the profiles table
-- Adds three boolean columns that track whether a user has accepted
-- the cookie policy, privacy policy and terms of service.  Each
-- column defaults to false for existing and new rows.  Users must
-- explicitly accept these policies via the application UI.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cookie_consent boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS privacy_consent boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_consent boolean NOT NULL DEFAULT false;