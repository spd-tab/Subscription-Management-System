# Brightloop Member 3 & Member 4 Integration Audit

**Audit date:** 2026-10-31
**Audited branch:** `feature/subscriptions-billing`
**Audit scope:** Repository state after merging `database-member-4` and `member-1-dashboard`.

## 1. Executive summary

**Overall integration status: PARTIALLY COMPLETE**

The Member 3 subscription and billing adapters map to the checked-in schema, the admin routes are wired, the recurring-invoice RPC is implemented in the SQL source, and the production build passes in the current working tree. Focused integration assertions and fake-Supabase adapter checks also pass.

This is not yet a production-verified integration:

- No live Supabase requests or SQL execution were performed. The SQL file is source evidence only; whether it has been applied to the configured project is unverified.
- There is no `supabase/migrations/` directory. The root schema starts with destructive `DROP TABLE ... CASCADE` statements and must not be used as an in-place production migration.
- Payments can create incorrect invoice balances because the payment trigger applies every inserted payment status, while the UI exposes method names that violate the database constraint.
- Portal subscription and invoice pages still render shared mock records, and portal payment lookup passes an auth user ID where the query expects a customer ID.
- The current committed dashboard hook imports a nonexistent module. The build passes only because the current working tree contains an uncommitted correction.
- Customer management remains mock-only despite a Supabase customer service existing.

No application code was changed during this audit. This report is the only file created for the audit. No `.env` contents were read, and no database changes were made.

## 2. Database integration

### Schema and adapter contract

The checked-in [schema](./supabase_schema.sql) contains the tables and fields used by the Member 3 adapters:

| Area | Schema evidence | Adapter use |
|---|---|---|
| Customers and plans | `customers.id/name/email`; `plans.id/name/billing_interval/interval_count/minimum_quantity/available_from/available_until/is_active`; `plan_items` product, variant, price, quantity, and tax-rate references | Subscription adapter reads customers and active plans, including plan items and tax-rate relationships. |
| Subscriptions | UUID IDs; customer and plan foreign keys; lowercase status check; start/end/next billing dates; `billing_interval`, `interval_count`, `currency`, `auto_close`, and payment terms | Adapter inserts subscription headers and item snapshots, normalizes lower-case statuses, and updates status/date fields. |
| Subscription items | Subscription/product foreign keys; optional variant/tax-rate foreign keys; description, quantity, unit price, and tax-rate snapshot | Adapter writes item snapshots derived from the selected plan. |
| Invoices | Customer and optional subscription foreign keys; billing period and issue/due dates; draft/confirmed/paid/cancelled status; currency and monetary totals | Invoice adapter lists and reads invoice headers with customer, subscription, and item relations; draft creation writes schema column names. |
| Invoice items | Invoice foreign key; nullable product/variant references; description and quantity/price/subtotal/discount/tax/total snapshots | Adapter writes calculated line snapshots and normalizes persisted descriptions. |
| Taxes and discounts | `tax_rates.id/name/rate_percent/is_active`; `discounts`, `invoice_discounts`, and `discount_products` | Draft invoice form selects an active database tax rate. Promotional discount-record application is not wired to invoice persistence. |
| Payments | Optional invoice foreign key; amount, payment method, date, status, and recorded-by fields | Shared payment queries use the payment table, but there are schema/UI and trigger mismatches described below. |

The relevant declarations and foreign keys are in [schema sections 4–10](./supabase_schema.sql#L98). The adapters use actual schema fields; no `tax_rate_id` is assumed on `invoice_items` (that table snapshots `tax_rate_percent`).

### RLS and permissions

The SQL source enables RLS and defines staff/admin write policies for subscriptions, subscription items, invoices, invoice items, payments, customers, plans, tax rates, and discounts. Customer policies restrict read access through the authenticated customer's linked record. The public registration trigger assigns the `customer` role, and the profile update policy prevents a user from changing their own role.

The recurring-invoice function in the source checks for an authenticated staff/admin caller, uses a fixed `search_path`, revokes execution from `PUBLIC` and `anon`, and grants execution to `authenticated` ([RPC authorization](./supabase_schema.sql#L401), [grants](./supabase_schema.sql#L701)). These are static source checks only; deployed grants and RLS behavior were not verified against Supabase.

Additional authorization review is needed for the non-RPC `SECURITY DEFINER` helpers and trigger functions; several do not set an explicit fixed `search_path`. The profile SELECT policy also permits all authenticated users to read profiles, including profile email/name fields.

### Recurring invoice RPC and migrations

- `public.generate_recurring_invoices(DATE, UUID)` is **implemented in `supabase_schema.sql`**, not merely documented. The invoice adapter calls it via `client.rpc`.
- It selects active due subscriptions, locks each subscription row, checks for an existing period, inserts invoice and item snapshots in one function transaction, and advances the next billing date. The partial unique index `unique_subscription_billing_period` is an additional duplicate boundary.
- It currently generates at most one period per eligible subscription per invocation, creates draft invoices, uses subscription item tax snapshots (or plan-item tax configuration as fallback), and applies no promotional discount.
- The SQL period calculation attempts to retain the original start-day anchor for monthly/yearly subscriptions. This was reviewed statically but not executed against PostgreSQL.
- There are **no tracked SQL migration files** under `supabase/migrations/`. The schema is a destructive reset/rebuild script: it drops 18 tables with `CASCADE` before recreating them ([destructive statements](./supabase_schema.sql#L9)). Do not run it against an environment containing data. Member 4 should supply a reviewed, non-destructive migration that creates or replaces the required objects.
- The SQL artifact being present does not establish that the function or tables exist in the linked Supabase project.

## 3. Subscription integration

### Implemented and checked

- Listing and detail reads query `subscriptions`, joined customers, plans, plan items, and subscription items.
- Creation verifies the selected customer and active plan, validates input, writes a subscription header, and snapshots plan item/product/variant/tax data into `subscription_items`.
- A child-item insert failure triggers compensating parent deletion; failure to clean up is surfaced as `AggregateError`. This is not a transaction spanning the header and item insert.
- Updates translate display statuses to the schema's lowercase values, check the allowed service-layer lifecycle transition, and use status/next-billing-date filters for optimistic concurrency.
- UI/service lifecycle transitions cover Draft → Quotation → Confirmed → Active, plus Active ↔ Paused and Active/Paused → Closed. Non-Active states are not eligible for invoice generation.
- The billing utilities check real calendar dates and include month-end/leap-year handling.

Focused tests passed for subscription list/detail/create/update using a fake Supabase client, lifecycle rules, due-date eligibility, and calendar calculations. This validates adapter request/response behavior against fixtures, not a live database.

### Gaps and risks

- `plans.auto_close` is not selected by `PLAN_SELECT`, normalized, or copied into `subscriptions.auto_close` on create. Consequently, a plan's auto-close setting is ignored and the RPC's auto-close branch will not run for subscriptions created through this form unless another path sets the subscription field.
- Lifecycle edge transitions are enforced in the JavaScript adapter, but the database status constraint only restricts the allowed set of values. A privileged client writing directly under staff/admin RLS can skip transitions.
- Renewal advances the billing period dates; it does not extend an existing `end_date`. The product meaning of “renew” should be confirmed before treating it as a contractual term extension.
- The database has no positive-value checks for interval counts or quantities. The UI validates common inputs, but direct privileged writes can create invalid billing data.

## 4. Billing integration

### Implemented and checked

- Draft invoice creation verifies the customer and selected active tax rate, calculates line and header totals, stores item descriptions/prices/tax snapshots, and reads the saved record back.
- The tax rate comes from the configured database `tax_rates` row, not a hardcoded frontend percentage. The schema's invoice-item tax column is `tax_rate_percent`.
- Fixed and percentage discount calculations validate boundaries and distribute discount amounts across line items. The fake-client check confirmed a supplied 99% line tax value is overridden by the selected database rate.
- Item insert failure triggers best-effort parent invoice cleanup; cleanup failure surfaces as `AggregateError`.
- Recurring invoice generation now calls the trusted RPC and propagates database errors; the client does not create recurring invoices or advance subscription schedules itself.

The fake-client checks covered invoice list/detail/draft creation, item snapshots, configured tax authority, and RPC argument/response/error handling. The checked-in integration script passed 10/10 assertions for calculations, dates, validation, lifecycle, due filtering, and a payment-balance simulation. The simulation does not execute the database payment trigger.

### Gaps and risks

- Ad hoc invoice discounts update invoice header/item discount snapshots but do not write an `invoice_discounts` row. Discount codes, usage limits, product scope, and usage-count triggers are therefore not part of this invoice-creation flow.
- Manual invoice header/item creation uses separate client requests plus compensating cleanup, not a database transaction. A trusted transactional draft-invoice operation would provide stronger integrity.
- Header totals are calculated in the client for manual drafts; the schema does not enforce that totals equal the sum of item snapshots.
- No live RPC invocation, concurrency/duplicate test, RLS test, or SQL test was run.

## 5. Payment reconciliation and shared modules

### Critical integration findings

1. **Payment trigger applies every payment status.** `handle_payment_applied()` adds `NEW.amount` to `invoices.amount_paid` whenever `invoice_id` is set, without checking whether the inserted payment is `paid` or `confirmed` ([trigger](./supabase_schema.sql#L361)). Pending, failed, or refunded rows can therefore increase the paid balance and can mark an invoice paid. The trigger also does not reverse or reconcile the invoice when a payment is later updated/refunded/deleted. The current unit test only simulates arithmetic in JavaScript.
2. **Payment method values violate the schema constraint.** The payment form offers `ach`, `wire`, and `check` ([form options](./src/pages/PaymentsPage.jsx#L189)), but the database permits `cash`, `bank_transfer`, `card`, `UPI`, `cheque`, and `other` ([payment schema](./supabase_schema.sql#L301)). The query forwards UI values directly ([mapping](./src/services/supabase/queries.js#L134)); choosing those three options causes a database constraint error.
3. **Payment load failures silently display demo records.** The payments page replaces an error result with `mockPayments` ([fallback](./src/pages/PaymentsPage.jsx#L25)). In a configured production session this can disguise an RLS/network/database failure as plausible payment data.
4. **Invoice-number lookup failure becomes an unlinked payment.** `createPayment` tries to resolve a provided invoice number but does not return the lookup error or reject when no invoice is found; it can insert a payment with `invoice_id: null` even though the form says it will be linked.

### Discounts and customer compatibility

- The customer page in `ReferencePages.jsx` remains mock-only. It filters the imported `customers` array instead of `customerList`, and its Add Customer form closes without calling the existing `createCustomer` query. The database-backed customer implementation present on the incoming Member 4 branch was not retained during route/page conflict resolution.
- The customer portal subscription and invoice pages still use shared mock data ([portal pages](./src/pages/PortalPages.jsx#L86), [invoice list](./src/pages/PortalPages.jsx#L139)); they are not connected to the Member 3 service adapters.
- Portal payment lookup passes `user.id` to a helper that filters `invoice.customer_id` by the provided value ([portal call](./src/pages/PortalPages.jsx#L195), [query filter](./src/services/supabase/queries.js#L83)). The authenticated user UUID is not the customer UUID. RLS still limits database rows, but this lookup will normally return no rows, and the UI retains mock payments when the result is empty.
- The discount page/query flow maps database fields but does not provide complete scheduled/expired lifecycle semantics. Automatic discount selection/application is absent from both manual and recurring invoice generation.

## 6. Application integration

- Admin routes for subscription list/detail and invoice list/detail are wired under an `AuthGuard` allowing `admin` and `staff` ([routes](./src/routes/AppRoutes.jsx#L48)).
- Customer portal routes are guarded for `customer`. The navigation exposes admin subscription and invoice links and portal links.
- Subscription and invoice routes render the feature pages; no separate centralized Supabase adapter is active in the final tree. A conflicting incoming `src/features/adapters/supabaseAdapters.js` implementation was not retained because the Member 3 feature services already provide adapters and the incoming version had unsafe mock fallbacks and hardcoded tax behavior.
- Build resolution found no unresolved dependency imports in the current working tree. `npm ls --depth=0` reported all declared top-level dependencies present.
- No lint/type-check script is configured. `npm run` exposes only `dev`, `build`, and `preview`.

### Committed versus working-tree build

The committed version of `src/hooks/useDashboardData.js` imports `../lib/client`, which does not exist. The current working tree has an uncommitted correction to `../services/supabase/client.js`; `npm run build` passes with that correction. A clean checkout of the current commit is expected to fail resolving that import until the correction is committed.

## 7. Files added, modified, and merged

### Member 4 merge commit (`f75d6e5`)

**Added**

- `src/features/tests/integration.test.mjs`

**Modified or reconciled**

- `src/components/layouts/AppShell.jsx`
- `src/features/billing/services/RECURRING_INVOICE_RPC_SPEC.md`
- `src/features/billing/services/billingEngine.js`
- `src/features/billing/services/supabaseInvoiceAdapter.js`
- `src/pages/AuthPages.jsx`
- `src/pages/DiscountsPage.jsx`
- `src/pages/PaymentsPage.jsx`
- `src/pages/PortalPages.jsx`
- `src/pages/ReferencePages.jsx`
- `src/routes/AppRoutes.jsx`
- `src/services/supabase/queries.js`
- `supabase_schema.sql`

The incoming branch also had overlapping subscription/billing pages and a second centralized adapter. Conflict resolution preserved the existing reviewed Member 3 feature modules; the duplicate centralized adapter was removed/not retained.

### Member 1 dashboard merge preceding Member 4

- Added `src/hooks/useDashboardData.js`.
- Modified `src/pages/ReferencePages.jsx`.
- The hook's committed import currently differs from the local uncommitted correction described above.

### Worktree state at audit

The branch is `feature/subscriptions-billing`, five commits ahead of `origin/feature/subscriptions-billing`. The pre-existing unstaged change is `src/hooks/useDashboardData.js`. The audit did not stage, commit, or alter it. The report itself is newly created and is not committed.

## 8. Build and test results

| Check | Result | Limits |
|---|---|---|
| `npm run build` | **PASS** | Ran against the current working tree, including the uncommitted dashboard import correction. Vite emitted a >500 kB chunk warning. |
| `node src/features/tests/integration.test.mjs` | **PASS — 10 passed, 0 failed** | Covers utility/lifecycle/request preparation and arithmetic simulation; not live database behavior. |
| Fake Supabase adapter contract checks | **PASS** | Subscription/invoice list, detail, create/update, snapshots, tax lookup, and RPC request/response/error paths exercised with a stub client. |
| `npm ls --depth=0` | **PASS** | Declared top-level dependencies present. |
| `git diff --check` | **PASS** | No whitespace errors in current worktree changes. |
| SQL execution / live Supabase CRUD, RLS, RPC and concurrency | **NOT RUN** | No live database changes or connections were made. |
| Lint/type check | **NOT CONFIGURED** | No lint or type-check script appears in `package.json`. |

## 9. Critical bugs and risks

| Priority | Finding | Owner |
|---|---|---|
| **Critical** | `supabase_schema.sql` drops production tables with `CASCADE`; applying it to an existing environment can destroy all application data. No migration directory exists. | Member 4 |
| **High** | Committed dashboard hook import is broken; the build passes only with the uncommitted local path correction. | Member 1 / Member 3 |
| **High** | Payment trigger adds every inserted payment status to paid totals and does not reconcile updates/refunds. | Member 4 |
| **High** | Customer portal subscription/invoice content remains shared mock data; payment query uses auth user ID instead of customer ID and retains mock rows on empty results. | Member 4 / Member 2 |
| **High** | Payment form values `ach`, `wire`, `check` do not satisfy the SQL payment-method CHECK constraint. | Member 4 |
| **High** | Customer admin list/create UI remains mock-only; the current Add Customer form is a no-op. | Member 2 / Member 4 |
| **Medium** | Plan `auto_close` configuration is not copied into new subscription records. | Member 3 |
| **Medium** | Lifecycle transition graph is client-service enforced but not database-enforced. | Member 3 / Member 4 |
| **Medium** | Invoice discount records/usage tracking are not connected to invoice draft persistence; manual invoice inserts are not transactional. | Member 3 / Member 4 |
| **Medium** | SQL source is not tied to an applied migration; deployment status of tables, policies, triggers, and RPC is unknown. | Member 4 |

## 10. Exact actions required

### Member 3

1. Commit the existing `useDashboardData.js` import correction, then verify the build from a clean checkout.
2. Include `plans.auto_close` in the plan selection/normalization and persist the intended value to each new subscription.
3. Decide and document what “renew” means for an end-dated subscription; if it extends a term, update the end date with explicit validation and confirmation.
4. Keep lifecycle checks in the service, and coordinate with Member 4 on database-level transition enforcement if direct privileged writes must obey the same state machine.
5. Connect manual discount-code application to `invoice_discounts` only after a trusted, atomic policy is agreed; avoid treating UI-only totals as authoritative.
6. Add persistent adapter tests for CRUD, rollback, concurrency, and schema status/column mappings rather than relying only on ephemeral fake-client checks.

### Member 4

1. Replace the destructive reset script with ordered, non-destructive Supabase migrations. Never run the current root schema against a database containing data.
2. Confirm deployment of the schema, all RLS policies/triggers, and `generate_recurring_invoices`; provide deployment evidence or a safe staging verification.
3. Correct payment reconciliation so only eligible successful payments change invoice balances and status, and handle updates/refunds/idempotency atomically. Add positive amount and appropriate status-transition constraints.
4. Align payment UI methods with the database enum or map UI values to canonical database values; reject invalid invoice references instead of creating unlinked payments.
5. Remove production mock-data fallbacks on payment errors and in customer portal views. Resolve the authenticated profile's linked customer ID and query only that customer's subscriptions, invoices, and payments.
6. Restore/complete the customers page integration with `fetchCustomers` and `createCustomer`, including explicit loading, empty, and error states.
7. Test the recurring RPC against PostgreSQL/Supabase for authorization, month-end/leap-year dates, unique-index concurrency, duplicate periods, and atomic rollback.
8. Add automated SQL policy/function tests and confirm safe `search_path` handling for all `SECURITY DEFINER` functions.

## 11. Overall status

**PARTIALLY COMPLETE.** Member 3 admin subscription/invoice adapters, schema mappings, lifecycle logic, draft calculations, routes, and the recurring RPC source are integrated and pass build/focused fixture tests. Production readiness is blocked by destructive schema deployment risk, unverified live deployment, payment reconciliation defects, incomplete portal/customer database integration, and the broken import in the committed dashboard hook.
