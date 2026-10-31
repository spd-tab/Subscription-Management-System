# Recurring invoice generation RPC specification for Member 4

**Status:** Required backend work; not implemented or executable SQL. The checked-in schema has no recurring invoice-generation RPC. The frontend must not insert recurring invoices or advance subscription schedules itself.

## Proposed contract

Member 4 should confirm the final name and signature before implementing. Proposed API:

```text
public.generate_due_subscription_invoices(p_as_of_date DATE DEFAULT CURRENT_DATE)
```

Return one result per processed subscription period, containing at least:

- `subscription_id UUID`
- `invoice_id UUID` (nullable when an existing period is reported as a duplicate)
- `invoice_number TEXT` (nullable for a duplicate without a returned invoice)
- `billing_period_start DATE`
- `billing_period_end DATE`
- `outcome TEXT` (`created`, `already_exists`, or a documented failure)

The browser sends only the requested as-of date. It must not send calculated totals or line snapshots as authoritative data. The RPC derives eligible records, prices, taxes, and due dates from the database.

## Transactional behavior

For each eligible subscription, atomically:

1. Require an authenticated admin/staff caller; reject anonymous or customer calls. If implemented as `SECURITY DEFINER`, set a fixed safe `search_path`, qualify object names, and perform an explicit role check using the database's existing role helpers.
2. Select `public.subscriptions` rows where `status = 'active'`, `next_billing_date <= p_as_of_date`, and the configured end-date policy permits billing. Lock rows to serialize concurrent workers (for example, `FOR UPDATE SKIP LOCKED`).
3. Use the subscription's `next_billing_date` as the period end boundary and derive the preceding boundary from `billing_interval`, `interval_count`, and the original `start_date` anchor. Document the convention for the schema's `billing_period_end`; Member 3 currently treats the boundary as exclusive.
4. Insert an invoice with the actual `customer_id`, `subscription_id`, `billing_period_start`, `billing_period_end`, `issue_date`, `due_date`, `currency`, and totals. Use `payment_terms_days` for the due-date rule, unless the team agrees a different rule. Generate `invoice_number` within the trusted database operation.
5. Snapshot every `subscription_items` row into `invoice_items`, including product/variant references where present, description, quantity, unit price, subtotal, discount, taxable amount, `tax_rate_percent`, tax amount, and total. Never read live product prices to reconstruct an existing invoice.
6. Advance `next_billing_date` only when the invoice and all invoice items have been inserted successfully. Keep the work in the same database transaction.
7. Use the existing partial unique index `unique_subscription_billing_period` as the final idempotency boundary. On a conflict, do not create duplicate line items and do not advance the subscription a second time; return a documented `already_exists` result.

The team must decide how many missed periods to catch up per call (one period per subscription or all periods through the as-of date), how expired subscriptions are handled, and whether automatically generated invoices are `draft` or `confirmed`. Those choices are intentionally not encoded by this frontend specification.

## Discounts and tax policy

- Subscription item tax snapshots use `subscription_items.tax_rate_percent`, as present in the schema. `invoice_items` has no `tax_rate_id`; it stores the tax percentage snapshot.
- The schema has `discounts` and `invoice_discounts`, but no subscription-to-discount relation or agreed automatic promotion-selection rule. Do not silently choose a promotion. Until Member 4/Member 2 specifies eligibility, usage limits, product scope, and application order, automatic recurring generation should apply no promotional discount and return `discount_amount = 0`.
- Any later promotion application must validate eligibility and update `invoice_discounts` in the same transaction. The existing trigger increments `discounts.usage_count`.
- Calculate persisted totals using database `NUMERIC(12,2)`-compatible rounding and verify header totals equal the sum of invoice-item snapshots.

## Frontend integration boundary

The Member 3 service calls `invoiceService.requestGeneration({ asOfDate })`. Until this RPC exists, the Supabase adapter deliberately returns an explicit unavailable-operation error. Do not replace this with browser-side invoice inserts, a service-role key, or a frontend duplicate check.
