# Recurring invoice generation RPC contract and review notes

**Status:** `public.generate_recurring_invoices(DATE, UUID)` is now defined in `supabase_schema.sql` and called by the Supabase invoice adapter. The contract below records the trusted-operation boundary and decisions that should remain aligned as the backend evolves.

## Implemented contract

The schema defines this RPC:

```text
public.generate_recurring_invoices(
  p_as_of_date DATE DEFAULT CURRENT_DATE,
  p_subscription_id UUID DEFAULT NULL
) RETURNS JSONB
```

It returns a summary with `success`, `as_of_date`, `generated_count`, `skipped_count`, and an `invoices` array. Each generated invoice entry includes:

- `subscription_id UUID`
- `invoice_id UUID`
- `invoice_number TEXT`
- `billing_period_start DATE`
- `billing_period_end DATE`
- `due_date DATE`
- `subtotal`, `tax_amount`, `total_amount`, and `currency`
- `next_billing_date DATE`

The browser sends only the requested as-of date. It must not send calculated totals or line snapshots as authoritative data. The RPC derives eligible records, prices, taxes, and due dates from the database.

## Transactional behavior

For each eligible subscription, atomically:

1. Require an authenticated admin/staff caller; reject anonymous or customer calls. If implemented as `SECURITY DEFINER`, set a fixed safe `search_path`, qualify object names, and perform an explicit role check using the database's existing role helpers.
2. Select `public.subscriptions` rows where `status = 'active'`, `next_billing_date <= p_as_of_date`, and the configured end-date policy permits billing. Lock rows with `FOR UPDATE` to serialize concurrent generation calls.
3. Use the subscription's `next_billing_date` as the period end boundary and derive the preceding boundary from `billing_interval`, `interval_count`, and the original `start_date` anchor. Document the convention for the schema's `billing_period_end`; Member 3 currently treats the boundary as exclusive.
4. Insert an invoice with the actual `customer_id`, `subscription_id`, `billing_period_start`, `billing_period_end`, `issue_date`, `due_date`, `currency`, and totals. Use `payment_terms_days` for the due-date rule, unless the team agrees a different rule. Generate `invoice_number` within the trusted database operation.
5. Snapshot every `subscription_items` row into `invoice_items`, including product/variant references where present, description, quantity, unit price, subtotal, discount, taxable amount, `tax_rate_percent`, tax amount, and total. Never read live product prices to reconstruct an existing invoice.
6. Advance `next_billing_date` only when the invoice and all invoice items have been inserted successfully. Keep the work in the same database transaction.
7. Check for an existing period and rely on the partial unique index `unique_subscription_billing_period` as the final idempotency boundary. A concurrent duplicate attempt cannot create a second invoice for the same period.

The current implementation generates at most one period per due subscription per call, excludes subscriptions whose end date precedes the due boundary, and creates draft invoices. These policies should be revisited only with an agreed billing contract.

## Discounts and tax policy

- Subscription item tax snapshots use `subscription_items.tax_rate_percent`, as present in the schema. `invoice_items` has no `tax_rate_id`; it stores the tax percentage snapshot.
- The schema has `discounts` and `invoice_discounts`, but no subscription-to-discount relation or agreed automatic promotion-selection rule. Do not silently choose a promotion. Until Member 4/Member 2 specifies eligibility, usage limits, product scope, and application order, automatic recurring generation should apply no promotional discount and return `discount_amount = 0`.
- Any later promotion application must validate eligibility and update `invoice_discounts` in the same transaction. The existing trigger increments `discounts.usage_count`.
- Calculate persisted totals using database `NUMERIC(12,2)`-compatible rounding and verify header totals equal the sum of invoice-item snapshots.

## Frontend integration boundary

The Member 3 service calls `invoiceService.requestGeneration({ asOfDate })`, which invokes the RPC and surfaces database errors. The browser does not insert recurring invoices or advance subscription schedules. Do not replace this with a service-role key or a frontend duplicate check.
