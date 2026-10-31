-- ============================================================
-- MIGRATION 003: Hardened Recurring Invoice Generation RPC
-- Purpose:
--   1. Protects RPC with Admin/Staff caller authorization check.
--   2. Locks subscription rows with FOR UPDATE to prevent race conditions.
--   3. Strictly enforces duplicate prevention via unique_subscription_billing_period.
--   4. Snapshots line items, GST taxes, and advances next_billing_date atomically.
-- ============================================================

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

  -- 2. Iterate with row-level locking on subscriptions
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
    -- 3. Calculate billing period
    v_period_start := v_sub.next_billing_date;
    v_period_end := CASE v_sub.billing_interval
      WHEN 'daily' THEN (v_period_start + (v_sub.interval_count || ' days')::INTERVAL)::DATE
      WHEN 'weekly' THEN (v_period_start + ((v_sub.interval_count * 7) || ' days')::INTERVAL)::DATE
      WHEN 'monthly' THEN (v_period_start + (v_sub.interval_count || ' months')::INTERVAL)::DATE
      WHEN 'yearly' THEN (v_period_start + (v_sub.interval_count || ' years')::INTERVAL)::DATE
      ELSE (v_period_start + INTERVAL '1 month')::DATE
    END;

    -- 4. Duplicate Check
    IF EXISTS (
      SELECT 1 FROM public.invoices
      WHERE subscription_id = v_sub.id
        AND billing_period_start = v_period_start
        AND billing_period_end = v_period_end
    ) THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- 5. Calculate due date
    v_due_date := (v_period_start + (COALESCE(v_sub.payment_terms_days, 15) || ' days')::INTERVAL)::DATE;

    -- 6. Generate unique invoice number
    v_invoice_number := 'INV-' || TO_CHAR(p_as_of_date, 'YYYYMMDD') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
    v_invoice_id := gen_random_uuid();

    v_subtotal := 0.00;
    v_tax_amount := 0.00;
    v_total_amount := 0.00;
    v_items_count := 0;

    -- Create draft invoice
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

    -- 7. Snapshot items from subscription_items or fallback to plan_items
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

    -- Update invoice header with final totals
    v_total_amount := v_subtotal + v_tax_amount;
    UPDATE public.invoices
    SET subtotal = v_subtotal,
        tax_amount = v_tax_amount,
        total_amount = v_total_amount
    WHERE id = v_invoice_id;

    -- 8. Advance next billing date and handle auto-close
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

    -- Record result summary
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

