-- Migration to update the invoice number format to rYYYYMMDDNNNNN per salon and day.

CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_salon_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_date TEXT;
  v_number TEXT;
BEGIN
  -- Format date as YYYYMMDD based on current date (invoice creation date)
  v_date := to_char(NOW(), 'YYYYMMDD');

  -- Count existing invoices for the same salon created on the current day
  SELECT COUNT(*) + 1 INTO v_count
  FROM invoices
  WHERE salon_id = p_salon_id
    AND created_at >= date_trunc('day', NOW())
    AND created_at < date_trunc('day', NOW()) + interval '1 day';

  -- Compose invoice number with prefix 'r' and 5-digit padded sequence
  v_number := 'r' || v_date || LPAD(v_count::TEXT, 5, '0');

  RETURN v_number;
END;
$$;