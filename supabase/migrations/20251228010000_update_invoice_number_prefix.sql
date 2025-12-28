-- Migration to update the invoice number format to include a salon-specific prefix.
-- The new format is <prefix>rYYYYMMDDNNNNN where <prefix> consists of the
-- first letter of the salon name and the first letter of the salon owner's first
-- name (both lowercased). 'r' denotes an invoice, YYYYMMDD is the current
-- date, and NNNNN is a five-digit sequence number per salon per day.

CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_salon_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_date TEXT;
  v_prefix TEXT := '';
  v_salon_name TEXT;
  v_owner_first TEXT;
BEGIN
  -- Fetch salon name and owner's first name to derive the prefix.
  SELECT s.name, p.first_name INTO v_salon_name, v_owner_first
  FROM salons s
  LEFT JOIN profiles p ON s.owner_id = p.user_id
  WHERE s.id = p_salon_id;

  -- Build prefix from initials, lowercased. If either is missing,
  -- fall back to an empty string for that part.
  v_prefix := lower(COALESCE(SUBSTRING(TRIM(v_salon_name) FROM 1 FOR 1), '')) ||
              lower(COALESCE(SUBSTRING(TRIM(v_owner_first) FROM 1 FOR 1), ''));

  -- Format date as YYYYMMDD based on current timestamp (invoice creation date).
  v_date := to_char(NOW(), 'YYYYMMDD');

  -- Count existing invoices for the same salon created on the current day to build the sequence.
  SELECT COUNT(*) + 1 INTO v_count
  FROM invoices
  WHERE salon_id = p_salon_id
    AND created_at >= date_trunc('day', NOW())
    AND created_at < date_trunc('day', NOW()) + interval '1 day';

  -- Compose invoice number: <prefix> + 'r' + date + 5-digit sequence.
  RETURN v_prefix || 'r' || v_date || LPAD(v_count::TEXT, 5, '0');
END;
$$;