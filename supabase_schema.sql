-- ============================================================
-- BRIGHTLOOP SUBSCRIPTION MANAGEMENT SYSTEM
-- Master Database Schema & Integration Contract (All 18 Tables)
-- Database: Supabase PostgreSQL
-- Currency: INR (Numeric 12,2) | UUID Primary Keys
-- ============================================================

-- 0. SCHEMA INITIALIZATION (Safe, non-destructive baseline)
-- Note: Destructive DROP TABLE CASCADE statements have been removed to protect live data.
-- To apply safe incremental migrations, refer to supabase/migrations/README.md

-- Enable UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. AUTHENTICATION & PROFILES (Member 4 / Member 2)
-- ============================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'staff', 'customer')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. CUSTOMERS (Member 2 / Member 4)
-- ============================================================

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  billing_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. PRODUCTS & VARIANTS (Member 2)
-- ============================================================

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'service',
  sales_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_modifier NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. TAX RATES (Member 2)
-- ============================================================

CREATE TABLE public.tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. PLANS & PLAN ITEMS (Member 2)
-- ============================================================

CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval_count INTEGER NOT NULL DEFAULT 1,
  minimum_quantity INTEGER NOT NULL DEFAULT 1,
  available_from DATE,
  available_until DATE,
  auto_close BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1.00,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  tax_rate_id UUID REFERENCES public.tax_rates(id) ON DELETE SET NULL
);

-- ============================================================
-- 6. QUOTATIONS & TEMPLATES (Member 2)
-- ============================================================

CREATE TABLE public.quotation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  validity_days INTEGER NOT NULL DEFAULT 30,
  terms TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  template_id UUID REFERENCES public.quotation_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  description TEXT,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1.00,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0.00
);

-- ============================================================
-- 7. SUBSCRIPTIONS & SUBSCRIPTION ITEMS (Member 3)
-- ============================================================

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_billing_date DATE,
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval_count INTEGER NOT NULL DEFAULT 1,
  payment_terms_days INTEGER NOT NULL DEFAULT 15,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  auto_close BOOLEAN NOT NULL DEFAULT FALSE,
  paused_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  description TEXT,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1.00,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  tax_rate_id UUID REFERENCES public.tax_rates(id) ON DELETE SET NULL,
  tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00
);

-- ============================================================
-- 8. INVOICES & INVOICE ITEMS (Member 3)
-- ============================================================

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  billing_period_start DATE,
  billing_period_end DATE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'paid', 'cancelled')),
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CRITICAL BILLING ENGINE CONSTRAINT: Prevent duplicate subscription invoices
CREATE UNIQUE INDEX IF NOT EXISTS unique_subscription_billing_period
ON public.invoices (
  subscription_id,
  billing_period_start,
  billing_period_end
)
WHERE subscription_id IS NOT NULL;

CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  description TEXT,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1.00,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  taxable_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00
);

-- ============================================================
-- 9. DISCOUNTS & INVOICE DISCOUNTS (Member 4 / Member 3)
-- ============================================================

CREATE TABLE public.discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
  value NUMERIC(12,2) NOT NULL,
  minimum_purchase NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  minimum_quantity NUMERIC(12,2) NOT NULL DEFAULT 1.00,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  applies_to TEXT NOT NULL DEFAULT 'both' CHECK (applies_to IN ('product', 'subscription', 'both')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.discount_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id UUID NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  UNIQUE (discount_id, product_id)
);

CREATE TABLE public.invoice_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  discount_id UUID NOT NULL REFERENCES public.discounts(id) ON DELETE RESTRICT,
  applied_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. PAYMENTS (Member 4)
-- ============================================================

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT UNIQUE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'UPI', 'cheque', 'other')),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'confirmed', 'pending', 'failed', 'refunded')),
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11. DATABASE FUNCTIONS & AUTOMATION TRIGGERS
-- ============================================================

-- Function 1: Auto-create Profile and link Customer on User Registration (Secured)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_assigned_role TEXT := 'customer';
BEGIN
  -- Strict security: Public registrations are forced to 'customer'.
  -- Administrative roles can only be granted by pre-existing admins.
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    v_assigned_role
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      updated_at = NOW();

  -- If customer registered with matching email, link their portal auth account
  UPDATE public.customers
  SET auth_user_id = NEW.id,
      updated_at = NOW()
  WHERE email = NEW.email AND auth_user_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sync any pre-existing auth users into profiles
INSERT INTO public.profiles (id, full_name, email, role)
SELECT 
  id,
  COALESCE(raw_user_meta_data ->> 'full_name', ''),
  COALESCE(email, ''),
  COALESCE(raw_user_meta_data ->> 'role', 'customer')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Function 2: Atomic Recalculation of Invoice Balance & Status
CREATE OR REPLACE FUNCTION public.recalculate_invoice_balance(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_paid NUMERIC(12,2);
  v_invoice_total NUMERIC(12,2);
  v_current_status TEXT;
  v_new_status TEXT;
BEGIN
  IF p_invoice_id IS NULL THEN
    RETURN;
  END IF;

  -- 1. Lock invoice row to prevent concurrent race conditions
  SELECT total_amount, status INTO v_invoice_total, v_current_status
  FROM public.invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 2. Aggregate only successfully completed payments ('paid' or 'confirmed')
  SELECT COALESCE(SUM(amount), 0.00) INTO v_total_paid
  FROM public.payments
  WHERE invoice_id = p_invoice_id
    AND status IN ('paid', 'confirmed');

  -- 3. Determine correct invoice status
  IF v_total_paid >= v_invoice_total AND v_invoice_total > 0 THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'confirmed';
  ELSE
    IF v_current_status = 'paid' THEN
      v_new_status := 'confirmed';
    ELSE
      v_new_status := v_current_status;
    END IF;
  END IF;

  -- 4. Apply reconciled values atomically
  UPDATE public.invoices
  SET amount_paid = v_total_paid,
      status = v_new_status,
      updated_at = NOW()
  WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_payment_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recalculate_invoice_balance(NEW.invoice_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.invoice_id IS NOT NULL AND OLD.invoice_id IS DISTINCT FROM NEW.invoice_id THEN
      PERFORM public.recalculate_invoice_balance(OLD.invoice_id);
    END IF;
    PERFORM public.recalculate_invoice_balance(NEW.invoice_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_invoice_balance(OLD.invoice_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_payment_change
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_payment_change();

-- Function 3: Auto-increment Discount usage_count when applied to an invoice
CREATE OR REPLACE FUNCTION public.handle_invoice_discount_applied()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.discounts
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = NEW.discount_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_invoice_discount_created
  AFTER INSERT ON public.invoice_discounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_invoice_discount_applied();

-- Function 4: Atomic Recurring Invoice Generation Engine (Member 3 / Member 4 RPC)
CREATE OR REPLACE FUNCTION public.generate_recurring_invoices(
  p_as_of_date DATE DEFAULT CURRENT_DATE,
  p_subscription_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_sub RECORD;
  v_item RECORD;
  v_period_start DATE;
  v_period_end DATE;
  v_due_date DATE;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_subtotal NUMERIC(12,2);
  v_tax_amount NUMERIC(12,2);
  v_total_amount NUMERIC(12,2);
  v_line_subtotal NUMERIC(12,2);
  v_line_tax NUMERIC(12,2);
  v_line_total NUMERIC(12,2);
  v_items_count INTEGER;
  v_generated_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_invoices JSONB := '[]'::JSONB;
  v_invoice_summary JSONB;
BEGIN
  -- 1. Authorization Guard: Only Admin or Staff accounts can run recurring generation
  IF NOT public.is_admin_or_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Only administrator and staff accounts can invoke recurring invoice generation.';
  END IF;

  -- Iterate over all active subscriptions due on or before p_as_of_date
  FOR v_sub IN
    SELECT 
      s.id,
      s.subscription_number,
      s.customer_id,
      s.plan_id,
      s.status,
      s.start_date,
      s.end_date,
      s.next_billing_date,
      s.billing_interval,
      s.interval_count,
      s.payment_terms_days,
      s.currency,
      s.auto_close,
      p.name AS plan_name
    FROM public.subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE s.status = 'active'
      AND s.next_billing_date <= p_as_of_date
      AND (s.end_date IS NULL OR s.end_date >= s.next_billing_date)
      AND (p_subscription_id IS NULL OR s.id = p_subscription_id)
    ORDER BY s.next_billing_date ASC
    FOR UPDATE OF s
  LOOP
    -- 1. Determine billing period
    v_period_start := v_sub.next_billing_date;
    v_period_end := CASE v_sub.billing_interval
      WHEN 'daily' THEN (v_period_start + (v_sub.interval_count || ' days')::INTERVAL)::DATE
      WHEN 'weekly' THEN (v_period_start + ((v_sub.interval_count * 7) || ' days')::INTERVAL)::DATE
      WHEN 'monthly' THEN (v_period_start + (v_sub.interval_count || ' months')::INTERVAL)::DATE
      WHEN 'yearly' THEN (v_period_start + (v_sub.interval_count || ' years')::INTERVAL)::DATE
      ELSE (v_period_start + INTERVAL '1 month')::DATE
    END;

    -- 2. Duplicate Prevention Check
    IF EXISTS (
      SELECT 1 FROM public.invoices
      WHERE subscription_id = v_sub.id
        AND billing_period_start = v_period_start
        AND billing_period_end = v_period_end
    ) THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- 3. Calculate due date
    v_due_date := (v_period_start + (COALESCE(v_sub.payment_terms_days, 15) || ' days')::INTERVAL)::DATE;

    -- 4. Generate unique invoice number
    v_invoice_number := 'INV-' || TO_CHAR(p_as_of_date, 'YYYYMMDD') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
    v_invoice_id := gen_random_uuid();

    -- 5. Calculate totals from subscription_items or fallback to plan_items
    v_subtotal := 0.00;
    v_tax_amount := 0.00;
    v_total_amount := 0.00;
    v_items_count := 0;

    -- Create draft invoice first
    INSERT INTO public.invoices (
      id,
      invoice_number,
      customer_id,
      subscription_id,
      billing_period_start,
      billing_period_end,
      issue_date,
      due_date,
      status,
      currency,
      subtotal,
      discount_amount,
      tax_amount,
      total_amount,
      amount_paid
    ) VALUES (
      v_invoice_id,
      v_invoice_number,
      v_sub.customer_id,
      v_sub.id,
      v_period_start,
      v_period_end,
      p_as_of_date,
      v_due_date,
      'draft',
      v_sub.currency,
      0.00,
      0.00,
      0.00,
      0.00,
      0.00
    );

    -- Check if subscription has explicit subscription_items
    SELECT COUNT(*) INTO v_items_count
    FROM public.subscription_items
    WHERE subscription_id = v_sub.id;

    IF v_items_count > 0 THEN
      FOR v_item IN
        SELECT 
          si.product_id,
          si.variant_id,
          COALESCE(si.description, p.name) AS description,
          si.quantity,
          si.unit_price,
          COALESCE(si.tax_rate_percent, 0.00) AS tax_rate_percent
        FROM public.subscription_items si
        JOIN public.products p ON p.id = si.product_id
        WHERE si.subscription_id = v_sub.id
      LOOP
        v_line_subtotal := ROUND(v_item.quantity * v_item.unit_price, 2);
        v_line_tax := ROUND((v_line_subtotal * v_item.tax_rate_percent / 100.0), 2);
        v_line_total := v_line_subtotal + v_line_tax;

        v_subtotal := v_subtotal + v_line_subtotal;
        v_tax_amount := v_tax_amount + v_line_tax;

        INSERT INTO public.invoice_items (
          invoice_id,
          product_id,
          variant_id,
          description,
          quantity,
          unit_price,
          subtotal,
          discount_amount,
          taxable_amount,
          tax_rate_percent,
          tax_amount,
          total_amount
        ) VALUES (
          v_invoice_id,
          v_item.product_id,
          v_item.variant_id,
          v_item.description,
          v_item.quantity,
          v_item.unit_price,
          v_line_subtotal,
          0.00,
          v_line_subtotal,
          v_item.tax_rate_percent,
          v_line_tax,
          v_line_total
        );
      END LOOP;
    ELSE
      -- Fallback to plan_items
      FOR v_item IN
        SELECT 
          pi.product_id,
          pi.variant_id,
          COALESCE(p.name, v_sub.plan_name) AS description,
          COALESCE(pi.quantity, 1.00) AS quantity,
          COALESCE(pi.unit_price, p.sales_price, 0.00) AS unit_price,
          COALESCE(tr.rate_percent, 0.00) AS tax_rate_percent
        FROM public.plan_items pi
        JOIN public.products p ON p.id = pi.product_id
        LEFT JOIN public.tax_rates tr ON tr.id = pi.tax_rate_id
        WHERE pi.plan_id = v_sub.plan_id
      LOOP
        v_line_subtotal := ROUND(v_item.quantity * v_item.unit_price, 2);
        v_line_tax := ROUND((v_line_subtotal * v_item.tax_rate_percent / 100.0), 2);
        v_line_total := v_line_subtotal + v_line_tax;

        v_subtotal := v_subtotal + v_line_subtotal;
        v_tax_amount := v_tax_amount + v_line_tax;

        INSERT INTO public.invoice_items (
          invoice_id,
          product_id,
          variant_id,
          description,
          quantity,
          unit_price,
          subtotal,
          discount_amount,
          taxable_amount,
          tax_rate_percent,
          tax_amount,
          total_amount
        ) VALUES (
          v_invoice_id,
          v_item.product_id,
          v_item.variant_id,
          v_item.description,
          v_item.quantity,
          v_item.unit_price,
          v_line_subtotal,
          0.00,
          v_line_subtotal,
          v_item.tax_rate_percent,
          v_line_tax,
          v_line_total
        );
      END LOOP;
    END IF;

    -- Update invoice header with final calculated totals
    v_total_amount := v_subtotal + v_tax_amount;
    UPDATE public.invoices
    SET subtotal = v_subtotal,
        tax_amount = v_tax_amount,
        total_amount = v_total_amount
    WHERE id = v_invoice_id;

    -- 6. Advance subscription next_billing_date & handle auto_close
    UPDATE public.subscriptions
    SET next_billing_date = v_period_end,
        status = CASE 
          WHEN auto_close = TRUE AND end_date IS NOT NULL AND v_period_end > end_date THEN 'closed'
          ELSE status
        END,
        closed_at = CASE 
          WHEN auto_close = TRUE AND end_date IS NOT NULL AND v_period_end > end_date THEN NOW()
          ELSE closed_at
        END,
        updated_at = NOW()
    WHERE id = v_sub.id;

    -- 7. Record to result summary
    v_invoice_summary := jsonb_build_object(
      'invoice_id', v_invoice_id,
      'invoice_number', v_invoice_number,
      'subscription_id', v_sub.id,
      'customer_id', v_sub.customer_id,
      'billing_period_start', v_period_start,
      'billing_period_end', v_period_end,
      'due_date', v_due_date,
      'subtotal', v_subtotal,
      'tax_amount', v_tax_amount,
      'total_amount', v_total_amount,
      'currency', v_sub.currency,
      'next_billing_date', v_period_end
    );
    v_invoices := v_invoices || v_invoice_summary;
    v_generated_count := v_generated_count + 1;

  END LOOP;

  RETURN jsonb_build_object(
    'success', TRUE,
    'as_of_date', p_as_of_date,
    'generated_count', v_generated_count,
    'skipped_count', v_skipped_count,
    'invoices', v_invoices
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 12. ROW LEVEL SECURITY (RLS) & ACCESS CONTROL
-- ============================================================

-- Enable RLS on all 18 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS checks
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((get_user_role() IN ('admin', 'staff')), FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_customer_id()
RETURNS UUID AS $$
  SELECT id FROM public.customers WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─── Profiles Policies ───
CREATE POLICY "Public profiles are readable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL TO authenticated USING (get_user_role() = 'admin');

-- ─── Customers Policies ───
CREATE POLICY "Staff and Admins full access to customers"
  ON public.customers FOR ALL TO authenticated USING (is_admin_or_staff());

CREATE POLICY "Customers view their own customer record"
  ON public.customers FOR SELECT TO authenticated USING (auth_user_id = auth.uid());

-- ─── Products & Catalog Policies (Products, Variants, Plans, Tax Rates) ───
CREATE POLICY "Catalog readable by authenticated"
  ON public.products FOR SELECT TO authenticated USING (is_active = TRUE OR is_admin_or_staff());

CREATE POLICY "Catalog manageable by staff and admins"
  ON public.products FOR ALL TO authenticated USING (is_admin_or_staff());

CREATE POLICY "Variants readable by authenticated"
  ON public.product_variants FOR SELECT TO authenticated USING (is_active = TRUE OR is_admin_or_staff());

CREATE POLICY "Variants manageable by staff and admins"
  ON public.product_variants FOR ALL TO authenticated USING (is_admin_or_staff());

CREATE POLICY "Plans readable by authenticated"
  ON public.plans FOR SELECT TO authenticated USING (is_active = TRUE OR is_admin_or_staff());

CREATE POLICY "Plans manageable by staff and admins"
  ON public.plans FOR ALL TO authenticated USING (is_admin_or_staff());

CREATE POLICY "Plan items readable by authenticated"
  ON public.plan_items FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Plan items manageable by staff and admins"
  ON public.plan_items FOR ALL TO authenticated USING (is_admin_or_staff());

CREATE POLICY "Tax rates readable by authenticated"
  ON public.tax_rates FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Tax rates manageable by staff and admins"
  ON public.tax_rates FOR ALL TO authenticated USING (is_admin_or_staff());

-- ─── Quotations Policies ───
CREATE POLICY "Staff and Admins full access to quotation templates"
  ON public.quotation_templates FOR ALL TO authenticated USING (is_admin_or_staff());

CREATE POLICY "Staff and Admins full access to quotations"
  ON public.quotations FOR ALL TO authenticated USING (is_admin_or_staff());

CREATE POLICY "Customers view their own quotations"
  ON public.quotations FOR SELECT TO authenticated USING (customer_id = get_customer_id());

CREATE POLICY "Staff and Admins full access to quotation items"
  ON public.quotation_items FOR ALL TO authenticated USING (is_admin_or_staff());

CREATE POLICY "Customers view their own quotation items"
  ON public.quotation_items FOR SELECT TO authenticated
  USING (quotation_id IN (SELECT id FROM public.quotations WHERE customer_id = get_customer_id()));

-- ─── Subscriptions Policies ───
CREATE POLICY "Staff and Admins full access to subscriptions"
  ON public.subscriptions FOR ALL TO authenticated USING (is_admin_or_staff());

CREATE POLICY "Customers view their own subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated USING (customer_id = get_customer_id());

CREATE POLICY "Staff and Admins full access to subscription items"
  ON public.subscription_items FOR ALL TO authenticated USING (is_admin_or_staff());

CREATE POLICY "Customers view their own subscription items"
  ON public.subscription_items FOR SELECT TO authenticated
  USING (subscription_id IN (SELECT id FROM public.subscriptions WHERE customer_id = get_customer_id()));

-- ─── Invoices Policies ───
CREATE POLICY "Staff and Admins full access to invoices"
  ON public.invoices FOR ALL TO authenticated USING (is_admin_or_staff());

CREATE POLICY "Customers view their own invoices"
  ON public.invoices FOR SELECT TO authenticated USING (customer_id = get_customer_id());

CREATE POLICY "Staff and Admins full access to invoice items"
  ON public.invoice_items FOR ALL TO authenticated USING (is_admin_or_staff());

CREATE POLICY "Customers view their own invoice items"
  ON public.invoice_items FOR SELECT TO authenticated
  USING (invoice_id IN (SELECT id FROM public.invoices WHERE customer_id = get_customer_id()));

-- ─── Discounts Policies ───
CREATE POLICY "Discounts viewable by authenticated users"
  ON public.discounts FOR SELECT TO authenticated USING (is_active = TRUE OR is_admin_or_staff());

CREATE POLICY "Discounts manageable by staff and admins"
  ON public.discounts FOR ALL TO authenticated USING (is_admin_or_staff());

CREATE POLICY "Discount products manageable by staff and admins"
  ON public.discount_products FOR ALL TO authenticated USING (is_admin_or_staff());

CREATE POLICY "Invoice discounts readable by owner or staff"
  ON public.invoice_discounts FOR SELECT TO authenticated
  USING (is_admin_or_staff() OR invoice_id IN (SELECT id FROM public.invoices WHERE customer_id = get_customer_id()));

CREATE POLICY "Invoice discounts manageable by staff and admins"
  ON public.invoice_discounts FOR ALL TO authenticated USING (is_admin_or_staff());

-- ─── Payments Policies ───
CREATE POLICY "Staff and Admins full access to payments"
  ON public.payments FOR ALL TO authenticated USING (is_admin_or_staff());

CREATE POLICY "Customers view their own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (invoice_id IN (SELECT id FROM public.invoices WHERE customer_id = get_customer_id()));

-- ============================================================
-- 13. REALISTIC SEED DATA (Indian Business Context — INR)
-- ============================================================

-- Tax Rates (GST)
INSERT INTO public.tax_rates (id, name, rate_percent, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'GST 0%', 0.00, TRUE),
  ('22222222-2222-2222-2222-222222222222', 'GST 5%', 5.00, TRUE),
  ('33333333-3333-3333-3333-333333333333', 'GST 12%', 12.00, TRUE),
  ('44444444-4444-4444-4444-444444444444', 'GST 18%', 18.00, TRUE),
  ('55555555-5555-5555-5555-555555555555', 'GST 28%', 28.00, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO public.products (id, name, type, sales_price, cost_price, notes, is_active)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Cloud ERP Suite', 'service', 25000.00, 10000.00, 'Complete business enterprise platform', TRUE),
  ('a2222222-2222-2222-2222-222222222222', 'CRM Pro License', 'service', 5000.00, 1500.00, 'Customer relationship module', TRUE),
  ('a3333333-3333-3333-3333-333333333333', 'Automated Invoicing Engine', 'service', 8000.00, 2500.00, 'Recurring billing and GST compliance', TRUE),
  ('a4444444-4444-4444-4444-444444444444', 'Dedicated Support SLA', 'service', 12000.00, 4000.00, '24/7 dedicated account manager', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Product Variants
INSERT INTO public.product_variants (id, product_id, name, price_modifier, is_active)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Standard (Up to 25 users)', 0.00, TRUE),
  ('b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Enterprise (Unlimited users)', 20000.00, TRUE),
  ('b3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222', 'Annual Prepaid Pass', -500.00, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Plans
INSERT INTO public.plans (id, name, billing_interval, interval_count, minimum_quantity, available_from, is_active)
VALUES
  ('c1111111-1111-1111-1111-111111111111', 'Starter Monthly', 'monthly', 1, 1, '2025-01-01', TRUE),
  ('c2222222-2222-2222-2222-222222222222', 'Growth Quarterly', 'monthly', 3, 1, '2025-01-01', TRUE),
  ('c3333333-3333-3333-3333-333333333333', 'Enterprise Annual', 'yearly', 1, 1, '2025-01-01', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Plan Items
INSERT INTO public.plan_items (id, plan_id, product_id, variant_id, quantity, unit_price, tax_rate_id)
VALUES
  ('d1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', NULL, 1.00, 5000.00, '44444444-4444-4444-4444-444444444444'),
  ('d2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 1.00, 45000.00, '44444444-4444-4444-4444-444444444444')
ON CONFLICT (id) DO NOTHING;

-- Customers
INSERT INTO public.customers (id, name, email, phone, billing_address)
VALUES
  ('e1111111-1111-1111-1111-111111111111', 'Acme Technologies Pvt Ltd', 'billing@acmetech.in', '+91 98765 43210', 'Plot 42, Cyber City, Gurugram, Haryana'),
  ('e2222222-2222-2222-2222-222222222222', 'Zenith Logistics LLP', 'finance@zenithlogistics.com', '+91 91234 56789', 'B-12, MIDC Industrial Area, Andheri East, Mumbai'),
  ('e3333333-3333-3333-3333-333333333333', 'Nova Retail Ventures', 'accounts@novaretail.co', '+91 99887 76655', '88 Commercial Street, Bengaluru, Karnataka')
ON CONFLICT (id) DO NOTHING;

-- Subscriptions
INSERT INTO public.subscriptions (
  id, subscription_number, customer_id, plan_id, status, start_date, next_billing_date,
  billing_interval, interval_count, payment_terms_days, currency, auto_close
)
VALUES
  ('f1111111-1111-1111-1111-111111111111', 'SUB-2025-001', 'e1111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'active', '2025-01-01', '2026-01-01', 'yearly', 1, 15, 'INR', FALSE),
  ('f2222222-2222-2222-2222-222222222222', 'SUB-2025-002', 'e2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'active', '2025-02-01', '2025-03-01', 'monthly', 1, 15, 'INR', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Invoices
INSERT INTO public.invoices (
  id, invoice_number, customer_id, subscription_id, billing_period_start, billing_period_end,
  issue_date, due_date, status, currency, subtotal, discount_amount, tax_amount, total_amount, amount_paid
)
VALUES
  ('71111111-1111-1111-1111-111111111111', 'INV-2025-001', 'e1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', '2025-01-01', '2025-12-31', '2025-01-01', '2025-01-16', 'paid', 'INR', 45000.00, 5000.00, 7200.00, 47200.00, 47200.00),
  ('72222222-2222-2222-2222-222222222222', 'INV-2025-002', 'e2222222-2222-2222-2222-222222222222', 'f2222222-2222-2222-2222-222222222222', '2025-02-01', '2025-02-28', '2025-02-01', '2025-02-16', 'confirmed', 'INR', 5000.00, 0.00, 900.00, 5900.00, 0.00)
ON CONFLICT (id) DO NOTHING;

-- Discounts (Member 4)
INSERT INTO public.discounts (
  id, name, code, discount_type, value, minimum_purchase, starts_at, ends_at, usage_limit, usage_count, applies_to, is_active
)
VALUES
  ('81111111-1111-1111-1111-111111111111', 'Welcome Launch Offer', 'WELCOME20', 'percentage', 20.00, 2000.00, '2025-01-01', '2025-12-31', 100, 14, 'both', TRUE),
  ('82222222-2222-2222-2222-222222222222', 'Enterprise Flat INR 5000', 'CORP5000', 'fixed', 5000.00, 25000.00, '2025-01-01', '2025-06-30', 50, 8, 'subscription', TRUE),
  ('83333333-3333-3333-3333-333333333333', 'Annual Loyalty Pass', 'ANNUAL15', 'percentage', 15.00, 10000.00, '2025-01-01', NULL, NULL, 42, 'subscription', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Payments (Member 4)
INSERT INTO public.payments (
  id, payment_number, invoice_id, amount, payment_method, payment_date, reference, note, status
)
VALUES
  ('91111111-1111-1111-1111-111111111111', 'PAY-2025-001', '71111111-1111-1111-1111-111111111111', 47200.00, 'bank_transfer', '2025-01-05 14:30:00+00', 'NEFT-AXIS-9823411', 'Full annual subscription payment', 'paid'),
  ('92222222-2222-2222-2222-222222222222', 'PAY-2025-002', '72222222-2222-2222-2222-222222222222', 2950.00, 'UPI', '2025-02-05 11:15:00+00', 'UPI-HDFC-5421980', '50% advance payment', 'confirmed')
ON CONFLICT (id) DO NOTHING;
