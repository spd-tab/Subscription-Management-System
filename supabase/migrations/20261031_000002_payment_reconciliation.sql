-- ============================================================
-- MIGRATION 002: Atomic & Status-Aware Payment Reconciliation
-- Purpose: Corrects invoice balance reconciliation so that:
--   1. Only 'paid' or 'confirmed' payments increase amount_paid.
--   2. 'pending' and 'failed' payments do not increase paid amounts.
--   3. Updates and deletions adjust the invoice amount_paid and status accurately.
--   4. Supports partial payments and marks status = 'paid' only when fully settled.
-- ============================================================

-- Function: Atomic recalculation of invoice balance from live payment records
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

  -- 2. Aggregate only successfully completed payments
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
    -- If no paid payments remain (e.g. refunded or deleted)
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

-- Trigger Function: Dispatches recalculation on payment INSERT, UPDATE, or DELETE
CREATE OR REPLACE FUNCTION public.handle_payment_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recalculate_invoice_balance(NEW.invoice_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If invoice_id was modified, recalculate both old and new invoices
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

-- Safely replace old single-event trigger
DROP TRIGGER IF EXISTS on_payment_created ON public.payments;
DROP TRIGGER IF EXISTS on_payment_change ON public.payments;

CREATE TRIGGER on_payment_change
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_payment_change();

-- Recalculate all existing invoices to repair any existing discrepancies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.invoices LOOP
    PERFORM public.recalculate_invoice_balance(r.id);
  END LOOP;
END $$;

