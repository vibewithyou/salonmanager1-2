-- Create transactions table for POS system
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  customer_id UUID,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  
  -- Transaction details
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 19.00,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2),
  tip_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Payment info
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'stripe', 'paypal', 'apple_pay', 'google_pay')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded', 'partially_refunded')),
  
  -- External payment references
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  
  -- Customer info (for guests)
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create transaction_items table for line items
CREATE TABLE public.transaction_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  
  -- Item details
  item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product')),
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  
  invoice_number TEXT NOT NULL,
  invoice_type TEXT NOT NULL DEFAULT 'invoice' CHECK (invoice_type IN ('invoice', 'receipt')),
  
  -- Customer billing info
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  
  -- Invoice content stored as JSONB for flexibility
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Totals
  subtotal NUMERIC(10,2) NOT NULL,
  tax_amount NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  tip_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- PDF storage
  pdf_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create refunds table
CREATE TABLE public.refunds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT,
  
  -- External references
  stripe_refund_id TEXT,
  paypal_refund_id TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  processed_by UUID REFERENCES public.employees(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions
CREATE POLICY "Admins can manage all transactions"
ON public.transactions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can view and create salon transactions"
ON public.transactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.user_id = auth.uid() AND e.salon_id = transactions.salon_id
));

CREATE POLICY "Employees can create transactions"
ON public.transactions FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.user_id = auth.uid() AND e.salon_id = transactions.salon_id
));

CREATE POLICY "Customers can view own transactions"
ON public.transactions FOR SELECT
USING (customer_id = auth.uid());

-- RLS Policies for transaction_items
CREATE POLICY "Admins can manage all transaction items"
ON public.transaction_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view transaction items they have access to"
ON public.transaction_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM transactions t
  WHERE t.id = transaction_items.transaction_id
  AND (
    t.customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.salon_id = t.salon_id)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
));

CREATE POLICY "Employees can create transaction items"
ON public.transaction_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM transactions t
  JOIN employees e ON e.salon_id = t.salon_id
  WHERE t.id = transaction_items.transaction_id AND e.user_id = auth.uid()
));

-- RLS Policies for invoices
CREATE POLICY "Admins can manage all invoices"
ON public.invoices FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can view and create salon invoices"
ON public.invoices FOR SELECT
USING (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.user_id = auth.uid() AND e.salon_id = invoices.salon_id
));

CREATE POLICY "Employees can create invoices"
ON public.invoices FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.user_id = auth.uid() AND e.salon_id = invoices.salon_id
));

-- RLS Policies for refunds
CREATE POLICY "Admins can manage all refunds"
ON public.refunds FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can view salon refunds"
ON public.refunds FOR SELECT
USING (EXISTS (
  SELECT 1 FROM transactions t
  JOIN employees e ON e.salon_id = t.salon_id
  WHERE t.id = refunds.transaction_id AND e.user_id = auth.uid()
));

-- Create indexes for performance
CREATE INDEX idx_transactions_salon_id ON public.transactions(salon_id);
CREATE INDEX idx_transactions_appointment_id ON public.transactions(appointment_id);
CREATE INDEX idx_transactions_payment_status ON public.transactions(payment_status);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX idx_transaction_items_transaction_id ON public.transaction_items(transaction_id);
CREATE INDEX idx_invoices_transaction_id ON public.invoices(transaction_id);
CREATE INDEX idx_invoices_salon_id ON public.invoices(salon_id);
CREATE INDEX idx_refunds_transaction_id ON public.refunds(transaction_id);

-- Trigger for updated_at
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_salon_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_year TEXT;
  v_number TEXT;
BEGIN
  v_year := to_char(NOW(), 'YYYY');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM invoices
  WHERE salon_id = p_salon_id
  AND created_at >= date_trunc('year', NOW());
  
  v_number := v_year || '-' || LPAD(v_count::TEXT, 5, '0');
  
  RETURN v_number;
END;
$$;