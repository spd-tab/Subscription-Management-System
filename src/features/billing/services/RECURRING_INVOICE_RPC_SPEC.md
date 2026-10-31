# Recurring Invoice Generation PostgreSQL RPC Specification

> **Function:** `public.generate_recurring_invoices(p_as_of_date DATE DEFAULT CURRENT_DATE, p_subscription_id UUID DEFAULT NULL)`  
> **Target Schema:** Supabase PostgreSQL (`public`)  
> **Security Model:** `SECURITY DEFINER` (executed with elevated privileges, verified for staff/admin callers)  
> **Language:** PL/pgSQL

---

## 1. Overview & Purpose

The `generate_recurring_invoices` stored procedure automates recurring billing across active subscriptions. It identifies all subscriptions due for billing on or before `p_as_of_date`, prevents duplicate billing for previously invoiced cycles, calculates subtotal, taxes (GST), and net amounts on the database side, snapshots line items to `public.invoice_items`, creates the `public.invoices` record, and advances the subscription's `next_billing_date` safely within an atomic transaction.

---

## 2. Function Signature

```sql
CREATE OR REPLACE FUNCTION public.generate_recurring_invoices(
  p_as_of_date DATE DEFAULT CURRENT_DATE,
  p_subscription_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER;
```

### Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `p_as_of_date` | `DATE` | `CURRENT_DATE` | The cutoff calendar date to evaluate billing eligibility (`next_billing_date <= p_as_of_date`). |
| `p_subscription_id` | `UUID` | `NULL` | Optional: When provided, restricts execution to a single subscription. When `NULL`, processes all due active subscriptions. |

### Return Value

Returns a structured `JSONB` response:

```json
{
  "success": true,
  "as_of_date": "2025-06-01",
  "generated_count": 2,
  "skipped_count": 0,
  "invoices": [
    {
      "invoice_id": "73333333-3333-3333-3333-333333333333",
      "invoice_number": "INV-20250601-0001",
      "subscription_id": "f2222222-2222-2222-2222-222222222222",
      "customer_id": "e2222222-2222-2222-2222-222222222222",
      "billing_period_start": "2025-06-01",
      "billing_period_end": "2025-07-01",
      "due_date": "2025-06-16",
      "subtotal": 5000.00,
      "tax_amount": 900.00,
      "total_amount": 5900.00,
      "currency": "INR",
      "next_billing_date": "2025-07-01"
    }
  ],
  "errors": []
}
```

---

## 3. Eligibility Criteria

A subscription is eligible for recurring invoice generation if and only if:
1. `status = 'active'` (draft, quotation, confirmed, paused, and closed subscriptions are strictly excluded).
2. `next_billing_date <= p_as_of_date`.
3. `end_date IS NULL OR end_date >= next_billing_date`.
4. If `p_subscription_id` is supplied: `id = p_subscription_id`.

---

## 4. Duplicate Prevention & Idempotency

### A. Unique Constraint
The database enforces duplicate invoice prevention via the unique partial index:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS unique_subscription_billing_period
ON public.invoices (
  subscription_id,
  billing_period_start,
  billing_period_end
)
WHERE subscription_id IS NOT NULL;
```

### B. Pre-Execution Check
Before generating an invoice, the function evaluates:
```sql
SELECT id FROM public.invoices
WHERE subscription_id = sub.id
  AND billing_period_start = v_period_start
  AND billing_period_end = v_period_end;
```
If an invoice already exists for this exact period, generation for this cycle is skipped, `skipped_count` is incremented, and an entry is logged in the `skipped` list.

---

## 5. Billing Period & Date Calculations

For each subscription:
- **`billing_period_start`:** `sub.next_billing_date`
- **`billing_period_end`:**
  - `daily`: `v_period_start + (sub.interval_count || ' days')::INTERVAL`
  - `weekly`: `v_period_start + (sub.interval_count * 7 || ' days')::INTERVAL`
  - `monthly`: `(v_period_start + (sub.interval_count || ' months')::INTERVAL)::DATE`
  - `yearly`: `(v_period_start + (sub.interval_count || ' years')::INTERVAL)::DATE`
- **`due_date`:** `v_period_start + (COALESCE(sub.payment_terms_days, 15) || ' days')::INTERVAL`

---

## 6. Snapshot & Line Item Calculations

1. **Items Source:**
   - Look up lines in `public.subscription_items` matching `subscription_id = sub.id`.
   - If no custom items exist, snapshot defaults from `public.plan_items` associated with `sub.plan_id`.
2. **Item Pricing & GST:**
   - `subtotal = item.quantity * item.unit_price`
   - `tax_amount = ROUND((subtotal * item.tax_rate_percent / 100.0), 2)`
   - `total_amount = subtotal + tax_amount`
3. **Invoice Aggregation:**
   - `subtotal = SUM(item.subtotal)`
   - `discount_amount = 0.00` (or promotional discount if applied)
   - `tax_amount = SUM(item.tax_amount)`
   - `total_amount = subtotal - discount_amount + tax_amount`
   - `amount_paid = 0.00`
   - `status = 'draft'` (or 'confirmed')

---

## 7. Subscription State Transition

Following successful invoice generation:
1. `next_billing_date` advances to `v_period_end`.
2. If `auto_close = TRUE` and `end_date IS NOT NULL` and `v_period_end > end_date`:
   - `status = 'closed'`
   - `closed_at = NOW()`
3. `updated_at = NOW()`.

