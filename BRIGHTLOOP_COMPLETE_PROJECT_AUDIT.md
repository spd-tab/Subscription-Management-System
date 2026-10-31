# Brightloop Complete Project Audit

**Audit date:** 2026-10-31
**Audited branch:** `feature/subscriptions-billing`
**Audited commit:** `e19a3f3929caf663924fe99844477be0de2a5755`
**Scope:** Current working tree after the visible Member 1 dashboard, Member 2 products/customers, Member 3 subscriptions/billing, and Member 4 database/auth/payments integration merges.

## A. Executive Summary

**Estimated project completion: approximately 40%.** This is a rounded engineering estimate of the required capability set, not a measured production-readiness score. The application has a substantial React interface, database-aware customer/product and subscription/invoice services, authentication code, and a recurring-invoice SQL function. Several critical workflows are still placeholders, statically demonstrated, or inconsistent with the database contract.

**Current status: Partially complete - significant work remains.**

The current checkout builds and its checked-in JavaScript integration suite passes. Those checks do **not** establish that the configured Supabase project has this schema, RPC, RLS policy set, or seed data deployed. No live Supabase reads/writes or SQL execution were performed for this audit.

### Biggest blockers

1. The only schema artifact, [supabase_schema.sql](./supabase_schema.sql), begins by dropping all 18 application tables with `CASCADE`. There is no `supabase/migrations/` directory. It is unsafe to apply to an existing data-bearing project.
2. Payment inserts can inflate invoice paid totals even when the payment is pending, failed, or refunded; the payment form also offers method values rejected by the schema.
3. The customer portal's subscription and invoice pages use shared mock data, and its payment page can retain shared mock payments after a successful empty result or error.
4. Member 2's plan, quotation, and tax-management screens are mock placeholders. Subscription creation depends on database plans/plan items but there is no UI/service to create or maintain them.
5. The dashboard uses live table reads, but its recurring-revenue graph is explicitly sample data and its outstanding total includes draft and cancelled invoices.
6. The current build depends on a pre-existing, **uncommitted** correction to the dashboard hook import. A clean checkout of the audited commit still references a nonexistent module.

### Evidence and verification boundary

- Read [TEAM_DEVELOPMENT.md](./TEAM_DEVELOPMENT.md), [README.md](./README.md), both prior Member 3 reports ([MEMBER3_INTEGRATION_REPORT.md](./MEMBER3_INTEGRATION_REPORT.md), [MEMBER3_MEMBER4_INTEGRATION_REPORT.md](./MEMBER3_MEMBER4_INTEGRATION_REPORT.md)), the checked-in schema, routes, shared components, all feature/service folders, auth/payment/portal pages, and the checked-in integration test.
- Confirmed merge history contains the Member 1 dashboard merge, the Member 4 `database-member-4` work, and the Member 2 `feature/products-plans-customers` merge. No separate `origin/feature/auth-payments-portal` branch is visible; Member 4's work is represented by the database branch/merge.
- The working tree already had a modified [useDashboardData.js](./src/hooks/useDashboardData.js) and an untracked [MEMBER3_MEMBER4_INTEGRATION_REPORT.md](./MEMBER3_MEMBER4_INTEGRATION_REPORT.md). They were not changed during this audit. The build was run against this working tree, not a pristine checkout.
- The root [README.md](./README.md) contains stale statements that there is no schema/persistence and that auth guards are passthrough. Those statements conflict with the current source files.
- The prior [MEMBER3_INTEGRATION_REPORT.md](./MEMBER3_INTEGRATION_REPORT.md) asserts that database objects were deployed and calls the destructive reset script idempotent. That deployment claim is not verifiable from this checkout; its characterization is not a safe migration claim. The later [MEMBER3_MEMBER4_INTEGRATION_REPORT.md](./MEMBER3_MEMBER4_INTEGRATION_REPORT.md) correctly distinguishes static source from unverified live deployment, but findings in it were rechecked against this current tree.

## B. Member-wise Completion

### Member 1 - Dashboard & Analytics

| Feature | Status | Evidence / File | Remaining Work |
|---|---|---|---|
| Dashboard layout and navigation | IMPLEMENTED | [ReferencePages.jsx](./src/pages/ReferencePages.jsx), [AppShell.jsx](./src/components/layouts/AppShell.jsx), [AppRoutes.jsx](./src/routes/AppRoutes.jsx) | Browser-level responsive and role testing is not part of the checked-in suite. |
| Dashboard data source | IMPLEMENTED | [useDashboardData.js](./src/hooks/useDashboardData.js) queries customers, subscriptions, invoices, and payments through Supabase. | Verify read permissions and result completeness in a safe staging project. Current reads have no pagination and are subject to the backend row limit. |
| Active subscription/customer counts | PARTIAL | [useDashboardData.js](./src/hooks/useDashboardData.js) counts statuses and returned customer rows. | Add pagination or aggregate queries; the page's period selector does not scope counts. |
| Revenue and collected-payment metrics | NEEDS FIX | [useDashboardData.js](./src/hooks/useDashboardData.js), [ReferencePages.jsx](./src/pages/ReferencePages.jsx) | The MRR card says unavailable; collected payment accuracy depends on the defective payment trigger; calculations are not time-period scoped. |
| Outstanding and overdue invoices | NEEDS FIX | [useDashboardData.js](./src/hooks/useDashboardData.js) | Outstanding balance sums draft and cancelled invoices as well as collectible invoices. Reconcile statuses and date-only due dates consistently. |
| Charts and analytics | PARTIAL | [ReferencePages.jsx](./src/pages/ReferencePages.jsx), [TrendChart.jsx](./src/components/charts/TrendChart.jsx) | The recurring-revenue chart is hardcoded sample trend data; there is no live revenue history or report calculation. |
| Reports | NOT IMPLEMENTED | `/admin/reports` is rendered by [ModulePage.jsx](./src/pages/ModulePage.jsx) from static demo rows. | Implement actual report queries/exports and date filters. |
| Clean-checkout build | NEEDS FIX | The committed hook imports `../lib/client`; the working tree imports the real client path in [useDashboardData.js](./src/hooks/useDashboardData.js). | Commit the existing local correction and verify from a clean checkout. |

### Member 2 - Customers, Products & Plans

| Feature | Status | Evidence / File | Remaining Work |
|---|---|---|---|
| Customer listing and search | IMPLEMENTED | [ReferencePages.jsx](./src/pages/ReferencePages.jsx), [customersService.js](./src/services/customersService.js) | Add pagination/filter requirements if customer volume exceeds one result page; current service fetches all rows. |
| Customer create/edit | IMPLEMENTED | [ReferencePages.jsx](./src/pages/ReferencePages.jsx), [customersService.js](./src/services/customersService.js) | Validate business fields and test the RLS-backed operations in staging. |
| Customer deletion/details | PARTIAL | `fetchCustomerById` exists in [customersService.js](./src/services/customersService.js), but the detail route is a static [ModulePage.jsx](./src/pages/ModulePage.jsx); no delete operation exists. | Decide a safe archival/deletion policy given restrictive foreign keys; implement a database-backed detail view. |
| Product create/edit/list/status | IMPLEMENTED | [ProductsPage.jsx](./src/pages/ProductsPage.jsx), [productsService.js](./src/services/productsService.js) | Validate schema constraints and role/RLS errors in staging. |
| Product variants | IMPLEMENTED | [ProductDetailPage.jsx](./src/pages/ProductDetailPage.jsx), [productsService.js](./src/services/productsService.js) | Add persistent tests and verify variant/item history behavior. |
| Plan creation and management | NOT IMPLEMENTED | `/admin/plans` resolves to [ModulePage.jsx](./src/pages/ModulePage.jsx); there is no plan service or plan page. | Build plan and plan-item CRUD, including product/variant/tax selection and validation. |
| Billing frequency, minimum quantity, availability dates, auto-close | PARTIAL | Schema fields exist; Member 3 reads plans in [supabaseSubscriptionAdapter.js](./src/features/subscriptions/services/supabaseSubscriptionAdapter.js). | Add plan editing UI and persist/test all policy fields. The subscription adapter omits plan `auto_close` and does not copy it to a new subscription. |
| Quotations and quotation lifecycle | NOT IMPLEMENTED | `/admin/quotations` and templates resolve to [ModulePage.jsx](./src/pages/ModulePage.jsx); only static route metadata/data exists. | Implement quote/template services, item snapshots, statuses, and conversion/linking to subscriptions. |
| Tax configuration | NOT IMPLEMENTED | `/admin/taxes` is a static [ModulePage.jsx](./src/pages/ModulePage.jsx). | Add tax-rate CRUD and connect plan-item tax configuration. Invoice drafting can select existing rates, but the team cannot manage them in the UI. |
| Database integration | PARTIAL | Customer and product services use actual schema table/column names. | Plans, quotations, and tax configuration remain disconnected; validate existing CRUD against the deployed schema and RLS. |

### Member 3 - Subscriptions & Billing

| Feature | Status | Evidence / File | Remaining Work |
|---|---|---|---|
| Subscription listing, search, details, create | IMPLEMENTED | [SubscriptionsPage.jsx](./src/features/subscriptions/pages/SubscriptionsPage.jsx), [SubscriptionForm.jsx](./src/features/subscriptions/components/SubscriptionForm.jsx), [supabaseSubscriptionAdapter.js](./src/features/subscriptions/services/supabaseSubscriptionAdapter.js) | Verify live CRUD and large-list performance. |
| Subscription item snapshot creation | IMPLEMENTED | [supabaseSubscriptionAdapter.js](./src/features/subscriptions/services/supabaseSubscriptionAdapter.js) snapshots plan items, product/variant labels, price, quantity, and tax percentage. | No subscription-item editor exists; failed child insert cleanup is compensating deletion, not a single transaction. |
| Lifecycle transitions | PARTIAL | [subscriptionLifecycle.js](./src/features/subscriptions/services/subscriptionLifecycle.js), [SubscriptionDetailsPage.jsx](./src/features/subscriptions/pages/SubscriptionDetailsPage.jsx) | Client/service rules are not enforced by a database trigger/constraint. Quotation changes status but does not create/link a quotation. Define pause/resume billing-period policy. |
| Pause, resume, close, renew | PARTIAL | Detail page confirms close/renew and guards pending actions. | Renew advances the next billing date but does not extend an existing expiry date; paused time/catch-up behavior is unspecified. |
| Plan-driven frequency and availability | PARTIAL | [SubscriptionForm.jsx](./src/features/subscriptions/components/SubscriptionForm.jsx), [supabaseSubscriptionAdapter.js](./src/features/subscriptions/services/supabaseSubscriptionAdapter.js) | UI initializes frequency/count from selected plan and filters plan availability; auto-close plan value is not selected/persisted. |
| Daily/weekly/monthly/yearly calculations | IMPLEMENTED | [calculationUtils.js](./src/features/billing/services/calculationUtils.js) | Checked-in tests cover monthly/quarterly/yearly and Jan-31-to-Feb-28; daily/weekly, leap-year, and repeated month-end cycles need explicit coverage. |
| Invoice list/detail/manual draft | IMPLEMENTED | [InvoicesPage.jsx](./src/features/billing/pages/InvoicesPage.jsx), [InvoiceDetailsPage.jsx](./src/features/billing/pages/InvoiceDetailsPage.jsx), [supabaseInvoiceAdapter.js](./src/features/billing/services/supabaseInvoiceAdapter.js) | No invoice confirmation/cancellation/edit lifecycle or payment history is exposed. Verify live operations. |
| Invoice item snapshots and configured tax | IMPLEMENTED | [supabaseInvoiceAdapter.js](./src/features/billing/services/supabaseInvoiceAdapter.js) persists line snapshots and reads active `tax_rates`. | Manual invoice parent/item persistence is not transactional; compensation deletes the parent if item insertion fails. Add transaction/RPC boundary and tests. |
| Discounts on invoices/recurring billing | NOT IMPLEMENTED | Calculation utilities accept a manual fixed/percentage discount; there is no `invoice_discounts` write in the invoice adapter/RPC path. | Implement eligibility/usage atomically with Member 4; do not treat client-only discount arithmetic as authoritative. |
| Recurring invoice RPC source and duplicate boundary | IMPLEMENTED | `generate_recurring_invoices` and `unique_subscription_billing_period` are in [supabase_schema.sql](./supabase_schema.sql); adapter calls the RPC in [supabaseInvoiceAdapter.js](./src/features/billing/services/supabaseInvoiceAdapter.js). | Deployment, authorization, transaction, date edge cases, and duplicate concurrency are unverified against PostgreSQL. There is no scheduled job or UI call site. |
| Live Supabase integration | BLOCKED | No live database request was performed; there are no migrations to establish deployment state. | Member 4 must provide a safe migration/staging deployment and evidence before production integration can be called verified. |

### Member 4 - Authentication, Payments & Customer Portal

| Feature | Status | Evidence / File | Remaining Work |
|---|---|---|---|
| Signup, login, reset password | IMPLEMENTED | [AuthContext.jsx](./src/context/AuthContext.jsx), [AuthPages.jsx](./src/pages/AuthPages.jsx) call Supabase Auth when configured. | Verify email-confirmation, reset redirect, session restoration, and error states against staging. |
| Role/profile sync | PARTIAL | [supabase_schema.sql](./supabase_schema.sql) defines profile creation and role constraints; [AuthContext.jsx](./src/context/AuthContext.jsx) loads profiles. | Live trigger/profile synchronization is unverified; profile-fetch failure returns `null` after console logging, without a user-facing recovery path. |
| Admin/staff/customer route guards | IMPLEMENTED | [AuthGuard.jsx](./src/components/layouts/AuthGuard.jsx), [AppRoutes.jsx](./src/routes/AppRoutes.jsx) restrict admin to admin/staff and portal to customer. | This is UI routing plus RLS, not a replacement for server-side policy. No automated authorization tests exist. |
| Admin-only staff creation | NOT IMPLEMENTED | `/admin/team` is a static [ModulePage.jsx](./src/pages/ModulePage.jsx); no staff provisioning flow/service is present. | Add a trusted admin-only operation (server/RPC) and audit trail; never allow public signup to choose a privileged role. |
| Payment recording | PARTIAL | [PaymentsPage.jsx](./src/pages/PaymentsPage.jsx), [queries.js](./src/services/supabase/queries.js) insert payment records. | Invalid UI payment methods violate schema; amount/invoice/customer validation is insufficient; user-provided customer name is not persisted. |
| Payment reconciliation and partial payments | NEEDS FIX | [handle_payment_applied](./supabase_schema.sql) trigger updates invoice totals; test suite simulates arithmetic only. | Trigger counts pending/failed/refunded inserts, has no update/refund reconciliation, and can mark a draft invoice paid. Add atomic settlement/refund handling and database constraints. |
| Payment methods/details | NEEDS FIX | [PaymentsPage.jsx](./src/pages/PaymentsPage.jsx), [queries.js](./src/services/supabase/queries.js), [supabase_schema.sql](./supabase_schema.sql) | Map `ach`/`wire`/`check` to allowed values or change the contract; reject unresolved invoice references and attach `recorded_by`. |
| Discount CRUD/usage limits | PARTIAL | [DiscountsPage.jsx](./src/pages/DiscountsPage.jsx), [queries.js](./src/services/supabase/queries.js), [supabase_schema.sql](./supabase_schema.sql) | Scheduled/expired filters/status are not implemented consistently; future start, minimum spend/quantity, product scope, and concurrent usage-limit checks are not enforced atomically. |
| Customer portal | NEEDS FIX | [PortalPages.jsx](./src/pages/PortalPages.jsx) | Dashboard, subscriptions, and invoices are hardcoded/shared demo content; payment lookup passes auth user ID instead of linked customer ID and retains mock rows on empty/error results. |
| RLS and customer isolation | PARTIAL | Policies exist in [supabase_schema.sql](./supabase_schema.sql), including customer-scoped record reads. | Deployment and runtime isolation are unverified; profile SELECT exposes every profile to every authenticated user. Existing-customer linking only runs on auth-user creation. |

## C. Feature-wise Audit

| Required capability | Status | Current evidence and finding |
|---|---|---|
| Admin dashboard and navigation | IMPLEMENTED | Dashboard route and main management navigation exist. Several linked areas intentionally lead to demo scaffolds. |
| Live dashboard data | IMPLEMENTED | Dashboard fetches four Supabase tables and displays loading/error states; no server aggregation or pagination is used. |
| Active subscription statistics | PARTIAL | Count uses returned rows only; a large table may be truncated by the API row cap. |
| MRR and recurring revenue history | NOT IMPLEMENTED | MRR is labeled unavailable; graph data is a static array. The month selector does not filter metric queries. |
| Outstanding/overdue balances | NEEDS FIX | Outstanding sums every invoice's nonnegative balance, including draft/cancelled invoices. |
| Customer list/create/edit/search | IMPLEMENTED | Current customer page calls Supabase service and provides loading/error/empty states and search. |
| Customer delete/detail | PARTIAL | No delete service; detail route is still mock-backed. |
| Product and variant CRUD | IMPLEMENTED | Database services cover product create/read/update/status and variant create/read/update/status/delete. |
| Plans and plan items | NOT IMPLEMENTED | Database schema exists, but page/service are placeholders. This blocks an admin-operated fresh catalog-to-subscription workflow. |
| Quotations and templates | NOT IMPLEMENTED | Schema tables exist, but UI/services are static. Subscription's Quotation transition only changes subscription status. |
| Tax-rate management | NOT IMPLEMENTED | Tax rates are read for invoice forms, but no tax-management UI/service is implemented. |
| Subscription create/list/detail | IMPLEMENTED | Uses Supabase adapters when configured and explicitly labelled temporary development data when local demo mode is used. |
| Subscription state machine | PARTIAL | Draft -> Quotation -> Confirmed -> Active, Active <-> Paused, and Active/Paused -> Closed are implemented at service level. No database transition enforcement. |
| Subscription item editing | NOT IMPLEMENTED | Items are created from plan snapshots but cannot be edited on the details page. |
| Pause/resume/renew/auto-close | PARTIAL | Pause/resume/close/renew controls exist; renewal does not extend expiry; plan `auto_close` is not copied during create; no defined paused-period catch-up policy. |
| Billing date calculations | IMPLEMENTED | Date-only validation and month-end clamping exist. Automated suite lacks explicit leap-year, daily/weekly, and repeated month-end cases. |
| Manual invoice draft creation/list/detail | IMPLEMENTED | Supabase adapter uses schema-aligned fields, active database tax rates, and line snapshots. Only draft creation is supported. |
| Invoice lifecycle and payment details | NOT IMPLEMENTED | No invoice confirmation/cancellation workflow, payment list in invoice details, or PDF output. |
| Invoice discounts and promotions | NOT IMPLEMENTED | Manual discount amount is computed in the browser. Discount records/eligibility/usage are not linked to invoice persistence. |
| Recurring invoice request | PARTIAL | Adapter calls an RPC implemented in the SQL source and uses a unique period index; no scheduled invocation, live deployment test, or runtime concurrency test exists. |
| Signup/login/password reset | IMPLEMENTED | Supabase Auth API calls are present; live behavior is unverified. In unconfigured mode AuthContext simulates arbitrary login as demo admin except known customer-like email values. |
| Role provisioning | PARTIAL | Public signup creates customer; admin/staff roles have no application-managed provisioning workflow. |
| Payment record/search/list | PARTIAL | Page and query service exist, but errors silently switch to demo payments and form values can fail schema constraints. |
| Partial payment/refund reconciliation | NEEDS FIX | SQL trigger does not filter status or reconcile updates/refunds; payment amount has no positive-value check. |
| Discount management and usage | PARTIAL | Basic CRUD calls exist; UI scheduled/expired states do not map to DB status and validation omits multiple eligibility requirements. |
| Customer portal record isolation | NEEDS FIX | Shared demo records are displayed rather than authenticated customer's database records. |
| RLS enforcement | PARTIAL | Policies are defined in source, not proven deployed or tested. Profile policy is broader than required for least privilege. |
| Responsive Stitch-inspired UI | IMPLEMENTED | Shared pages/styles and feature pages compile; no browser/device audit was run as part of this source/CLI verification. |

## D. Database Audit

### Schema inventory and relationships

The root SQL source declares 18 application tables:

- Identity and ownership: `profiles` references `auth.users`; `customers.auth_user_id` references `profiles`.
- Catalog: `product_variants.product_id` references `products`; `plan_items` references plans, products, variants, and tax rates.
- Quotes: `quotations` references customers/templates; `quotation_items` references quotations, products, and optional variants.
- Subscriptions: `subscriptions` references customers, plans, and optional quotations; `subscription_items` references subscriptions, products, variants, and tax rates.
- Invoicing: `invoices` references customers and optional subscriptions; `invoice_items` references invoices, products, and variants.
- Discounts: `discount_products` references discounts/products; `invoice_discounts` references invoices/discounts.
- Payments: `payments` references optional invoices and optional recording profiles.

The Member 3 adapters' visible table/column selections align with the schema source: subscription `start_date/end_date/next_billing_date`, `billing_interval/interval_count`, and item tax snapshots; invoice `issue_date/due_date`, `billing_period_*`, monetary totals, invoice item snapshots, and active `tax_rates`. Customer/product services likewise use existing schema names. This is a **static source comparison**, not proof that the deployed database matches the file.

### Migrations and deployment

- No tracked `supabase/migrations/` files or migration directory are present.
- [supabase_schema.sql](./supabase_schema.sql) starts with `DROP TABLE IF EXISTS ... CASCADE` for all application tables and drops functions. This is a destructive rebuild/reset script, not a safe forward migration. Do not execute it against an environment containing data.
- The file defines seed data, but its presence does not prove that the linked Supabase project has been initialized or is at the same schema version.
- No SQL was executed and no live Supabase request was made. Tables, triggers, RLS policies, grants, RPC deployment, and row-level behavior remain unverified in the actual project.

### Functions, constraints, and financial integrity

- `generate_recurring_invoices(DATE, UUID)` exists in the schema source. It restricts calls to authenticated admin/staff, uses a fixed `search_path`, locks due active subscriptions, inserts invoice/items in one function call, advances next billing date, and has a partial unique index on subscription and billing period. The source also handles month/year anchor dates. Its runtime behavior and grants were not tested.
- There is no cron/scheduler configuration or application UI call site for recurring invoice generation. The RPC can be requested through the feature service, but automatic recurring execution is not established.
- `handle_payment_applied()` runs after every payment insert and adds `NEW.amount` without checking payment status. It is not defined for payment updates/deletes/refunds. The schema allows `pending`, `failed`, and `refunded`; therefore those inserts can increase invoice `amount_paid` and mark an invoice paid. A draft invoice can also become `paid`.
- The payment method CHECK permits `cash`, `bank_transfer`, `card`, `UPI`, `cheque`, `other`; the UI offers `ach`, `wire`, and `check` and the query forwards those values.
- `payments.amount`, product prices, plan quantities/interval counts, tax percentages, discount values/usage, and many invoice totals lack nonnegative/positive consistency constraints. Date-order invariants are not enforced at the database layer.
- Lifecycle transitions are enforced in the Member 3 adapter only. RLS allows staff/admin writes to subscriptions, so privileged direct writes can bypass the state machine.
- `subscriptions.updated_at` has no generic update trigger, and the subscription adapter does not set it during lifecycle updates.
- The invoice unique index and RPC row lock are a sound source-level duplicate-prevention design for recurring generation, but manual invoice creation is separate and parent/item writes are compensating operations rather than one transaction.

### RLS and security

- RLS is enabled in the schema source for all 18 listed application tables. Staff/admin policies allow management; customer policies scope subscriptions, quotations, invoices, items, and payments through the linked customer.
- The profiles SELECT policy allows **every authenticated user to read every profile**, including names and email addresses. Restrict it to self/admin/staff or expose only necessary public fields.
- The customer link is created when an auth user is inserted and a customer with the same email already exists. There is no reverse link when a customer is added after the auth account; that account then has no matching `get_customer_id()` result for portal RLS.
- Several `SECURITY DEFINER` functions other than the recurring RPC do not specify a fixed `search_path`. Review and harden them consistently.
- Public signup sets role to `customer` in the trigger, and the role column has a three-value CHECK. The UI contains no admin-only staff creation path or trusted role-provisioning service.
- RLS policies are static definitions only. No authenticated customer/admin/staff isolation tests were executed. UI route guards do not replace RLS.

## E. Integration Audit

### Customer -> Product -> Plan -> Subscription -> Invoice -> Payment

1. **Customer:** Admin customer listing and create/edit use the Supabase customer table. Customer details and deletion are incomplete. Customer creation does not link a previously registered auth account.
2. **Product/variant:** Product and variant services/pages use Supabase. This link is available to subscription plans through `plan_items`.
3. **Plan:** The chain currently breaks operationally here. Plans/plan items exist in SQL and are read by Member 3, but `/admin/plans` is static demo data and there is no plan CRUD service.
4. **Subscription:** The form can load existing active/available plans and customers, snapshots plan items, and provides list/detail/lifecycle operations. It cannot create a quotation relationship or edit subscription items.
5. **Invoice:** Manual draft creation stores schema-aligned headers and line snapshots; recurring request delegates to the database RPC. There is no invoice issue/confirmation UI, and discounts are not attached.
6. **Payment:** Payment insertion exists, but invalid method values, unresolved invoice IDs, lack of amount validation, and the trigger bug make financial reconciliation unsafe.

### Other cross-member seams

- Dashboard and Member 3 pages use different data adapters. Dashboard metrics bypass the feature adapters and issue broad direct reads.
- Customer portal is not connected to Member 3's subscription/invoice services. Its payments call passes `auth.users.id` to a helper filtering by `customers.id`, and it keeps shared demo payments if query returns no rows.
- Discount validation is not used to apply discounts to invoice or recurring invoice records. `invoice_discounts` is not written by the billing adapter.
- `/admin/plans`, `/admin/quotations`, `/admin/quotation-templates`, `/admin/taxes`, `/admin/reports`, and `/admin/team` use the generic demo [ModulePage.jsx](./src/pages/ModulePage.jsx). Its “Save draft” action only closes the modal and is explicitly not persisted.
- Routes retain role guards for admin/staff and customer portal. Products/customers/subscriptions/invoices have real admin pages, but many visible navigation entries still lead to placeholders.
- The merge history shows the Member 1, Member 2 and Member 4 work in this branch. The current branch is seven commits ahead of `origin/feature/subscriptions-billing`; it has not been pushed as part of this audit.

## F. Bugs and Risks

### Critical

| Finding | Impact | Evidence |
|---|---|---|
| Destructive reset SQL with `DROP TABLE ... CASCADE` and no migration history | If used against a populated project it can delete application data and dependent objects. Current deployment state is unknown. | [supabase_schema.sql](./supabase_schema.sql) |

### High

| Finding | Impact | Evidence |
|---|---|---|
| Payment trigger applies all inserted statuses and has no refund/update reconciliation | Pending/failed/refunded entries can inflate paid totals and mark invoices paid; balances can become incorrect. | [supabase_schema.sql](./supabase_schema.sql), [PaymentsPage.jsx](./src/pages/PaymentsPage.jsx) |
| Payment form methods disagree with database CHECK | ACH, wire, and check submissions fail at persistence; no canonical mapping exists. | [PaymentsPage.jsx](./src/pages/PaymentsPage.jsx), [queries.js](./src/services/supabase/queries.js), [supabase_schema.sql](./supabase_schema.sql) |
| Shared demo data in customer portal | Customers do not see their own database records; mock payment records remain visible on empty/error results. | [PortalPages.jsx](./src/pages/PortalPages.jsx) |
| Auth user/customer linking only works in one creation order | Customers created after auth signup are not linked by the existing trigger; portal RLS then finds no customer record. | [supabase_schema.sql](./supabase_schema.sql), [customersService.js](./src/services/customersService.js) |
| Profile RLS exposes all profiles to any authenticated user | Unnecessary disclosure of profile names/emails across the authenticated tenant boundary. | Profiles SELECT policy in [supabase_schema.sql](./supabase_schema.sql) |
| Uncommitted import correction masks broken committed dashboard import | Current build passes, but the audited commit's clean checkout cannot resolve `../lib/client`. | [useDashboardData.js](./src/hooks/useDashboardData.js) |

### Medium

| Finding | Impact | Evidence |
|---|---|---|
| Outstanding dashboard amount includes draft/cancelled invoices | Executive totals overstate collectible balances. | [useDashboardData.js](./src/hooks/useDashboardData.js) |
| Dashboard data has no pagination/aggregation and period selector is not applied | Counts and totals can be truncated and are not time-scoped. | [useDashboardData.js](./src/hooks/useDashboardData.js), [ReferencePages.jsx](./src/pages/ReferencePages.jsx) |
| No plan CRUD, quote lifecycle, or tax-management pages | Operators cannot configure the objects required for a fresh end-to-end catalog/subscription workflow. | [ModulePage.jsx](./src/pages/ModulePage.jsx), [AppRoutes.jsx](./src/routes/AppRoutes.jsx) |
| Subscription auto-close plan field is dropped; renewal does not extend expiry | Persisted behavior can differ from plan configuration; renewed subscriptions can remain active but not billable past their end date. | [supabaseSubscriptionAdapter.js](./src/features/subscriptions/services/supabaseSubscriptionAdapter.js), [subscriptionLifecycle.js](./src/features/subscriptions/services/subscriptionLifecycle.js) |
| Subscription state graph is not enforced in SQL; pause/resume semantics unclear | Privileged direct writes bypass transitions; resuming a paused subscription whose next billing date is past can bill immediately without an agreed policy. | [subscriptionLifecycle.js](./src/features/subscriptions/services/subscriptionLifecycle.js), [supabase_schema.sql](./supabase_schema.sql) |
| Scheduled/expired discount state and eligibility are incomplete | Filters do not map to timestamps; future start/minimums/product scope are not checked, and usage limits are not protected atomically. | [DiscountsPage.jsx](./src/pages/DiscountsPage.jsx), [queries.js](./src/services/supabase/queries.js), [supabase_schema.sql](./supabase_schema.sql) |
| No recurring scheduler or UI entry point | RPC source exists, but automatic execution has not been wired or verified. | [billingEngine.js](./src/features/billing/services/billingEngine.js), [supabaseInvoiceAdapter.js](./src/features/billing/services/supabaseInvoiceAdapter.js) |
| Manual invoice parent/item inserts are not transactional | Compensation is best-effort; delete failure can leave incomplete invoice data. | [supabaseInvoiceAdapter.js](./src/features/billing/services/supabaseInvoiceAdapter.js) |
| Payments and discounts silently use/fall through to demo behavior | Configured payment-load errors show mock records; discount page has no visible load error. Unconfigured auth allows simulated sign-in, including a default demo admin. | [PaymentsPage.jsx](./src/pages/PaymentsPage.jsx), [DiscountsPage.jsx](./src/pages/DiscountsPage.jsx), [AuthContext.jsx](./src/context/AuthContext.jsx) |
| Existing README and one prior report contain stale/unverified backend claims | Team members may rely on claims that conflict with current code or were never runtime-verified. | [README.md](./README.md), [MEMBER3_INTEGRATION_REPORT.md](./MEMBER3_INTEGRATION_REPORT.md) |

### Low

| Finding | Impact | Evidence |
|---|---|---|
| Vite emits a chunk-size warning for a bundle over 500 kB | Performance optimization opportunity; it does not fail the build. | Build output from `npm run build`. |
| No lint, test, or type-check npm scripts | Quality checks are manual and do not run as a standard project command/CI gate. | [package.json](./package.json) |
| Shared `ModulePage` presents demo metrics/data for several real-looking routes | Can mislead users during demonstrations unless placeholder status is prominent. | [ModulePage.jsx](./src/pages/ModulePage.jsx) |

## G. Remaining Work

| Task | Responsible Member | Priority | Dependency | Acceptance Criteria |
|---|---|---:|---|---|
| Replace destructive reset-only SQL workflow with ordered, reviewed, non-destructive migrations | Member 4 | Critical | Confirm target schema and current deployment state | Fresh and upgrade migration paths apply in a disposable/staging database without dropping existing data; deployed version is recorded. |
| Correct payment reconciliation for settled/pending/failed/refunded states, updates, reversals, overpayment, and idempotency | Member 4 | High | Agree canonical payment status semantics | Database transaction tests prove only eligible settled amounts affect invoice balance; refunds/updates reconcile; duplicate handling is deterministic. |
| Align UI payment methods and validate amount/invoice/customer before insert | Member 4 | High | Payment status/method contract | Every displayed method maps to allowed DB value; nonpositive amount and unknown invoice are rejected; actor is recorded; tests cover DB constraints. |
| Remove mock data from production payment and all portal views; resolve customer via authenticated profile/customer mapping | Member 4, coordinate Member 2 | High | Reliable auth-user/customer linking | Portal queries use `customers.id`, show only the authenticated customer's records, and show explicit empty/error states with zero shared mock records. |
| Add reverse customer/auth link or enforce account/customer provisioning order | Member 2 + Member 4 | High | Decide onboarding flow | Both “customer before signup” and “signup before customer” result in exactly one correct link; RLS tests verify isolation. |
| Restrict profile RLS and harden SECURITY DEFINER functions | Member 4 | High | Confirm role/profile access requirements | Customer cannot read other profiles; all definer functions use fixed safe search paths and pass role/RLS tests. |
| Commit dashboard import correction and run clean-checkout build | Member 1 (change exists locally; current branch maintainer to coordinate) | High | Commit existing working-tree fix | Clean checkout of resulting commit resolves the client module and `npm run build` passes. |
| Correct dashboard outstanding/overdue state logic; add server-side aggregation/pagination and period filtering | Member 1 | Medium | Invoice/payment status contract | Totals exclude draft/cancelled/noncollectible records, agree with fixture calculations, and are complete over >1,000-row fixtures. |
| Implement live MRR and revenue trend/report queries | Member 1 | Medium | Settled-payment and subscription pricing semantics | MRR/revenue charts use database records and selected date range; no hardcoded trend series remains. |
| Implement plan and plan-item CRUD including billing rules, dates, minimum quantity, auto-close, and configured tax | Member 2 | High | Product/variant and tax schema | Authorized staff can create/edit/deactivate plans; validation and service tests cover each schema field; subscription form can use saved plans. |
| Implement quotations/templates and conversion/linking to subscriptions | Member 2, coordinate Member 3 | Medium | Lifecycle and quote acceptance contract | Quote CRUD/status transitions persist; accepted quote can be associated with the resulting subscription; no status-only fake quotation action. |
| Implement tax-rate management and validate the rate used by invoices/plans | Member 2, coordinate Member 3 | Medium | Tax policy | Admin/staff can manage rates; invoice/plan forms use active persisted rates and preserve snapshots. |
| Add customer detail and deletion/archive policy; implement persistent tests | Member 2 | Medium | Foreign-key retention policy | Detail route loads actual record; deletion/archive cannot orphan billing history; RLS and validation are tested. |
| Preserve plan `auto_close` in subscription creation and define/test renew/expiry/pause catch-up semantics | Member 3 | High | Member 2 plan fields; business policy decision | Stored subscription honors plan policy; renewal adjusts contract term as agreed; pause/resume produces a documented, tested next due date. |
| Add subscription-item management and database-level lifecycle enforcement | Member 3 + Member 4 | Medium | Decide whether item edits create history/version snapshots | Authorized operations edit items safely; invalid lifecycle transitions are rejected even outside the browser. |
| Add invoice lifecycle, payment detail display, and atomic invoice draft creation | Member 3 + Member 4 | Medium | Payment status/discount contract | Issue/confirm/cancel behavior is defined; item/header writes are atomic; invoice view reflects immutable snapshots and linked payment history. |
| Apply discount eligibility and usage atomically to manual/recurring invoices | Member 3 + Member 4; Member 2 for UI/config | Medium | Decide product scope, minimums, timing, stacking, tax order | Trusted server/database operation validates all constraints and increments usage exactly once under concurrency; invoice snapshots reconcile. |
| Add automated adapter, SQL/RLS/RPC, date-edge, and failure-cleanup tests | Member 3 + Member 4 | High | Safe disposable PostgreSQL/Supabase test environment | CI runs CRUD, permissions, rollback, duplicate concurrency, refund, leap-year/month-end, daily/weekly, and schema-mapping cases. |
| Update README and integration reports to distinguish code presence from deployed/verified behavior | Team lead; contributing members | Medium | Verify deployment facts | Documentation matches routes, schema/migrations, current mock behavior, and actual test/deployment evidence. |

## H. Testing Results

| Command / check | Result | What it establishes / limitation |
|---|---|---|
| `npm run build` | **PASS** | Vite transformed 2,284 modules and emitted a production build. It emitted a >500 kB chunk warning. Ran with the pre-existing uncommitted dashboard import correction. |
| `node src/features/tests/integration.test.mjs` | **PASS - 10 passed, 0 failed** | Covers subscription input validation, selected billing date cases including Jan 31 -> Feb 28, lifecycle simulation, invoice arithmetic/validation, due filtering/request preparation, and simulated payment arithmetic. It does not call Supabase or PostgreSQL. |
| `npm run` | **PASS / inventory** | Only `dev`, `build`, and `preview` scripts are configured. There is no `test`, `lint`, or type-check script. |
| `git diff --check` | **PASS** | No whitespace errors in the pre-existing worktree diff at audit time. |
| `git status --short` | **Existing changes detected** | Modified `src/hooks/useDashboardData.js`; untracked `MEMBER3_MEMBER4_INTEGRATION_REPORT.md`. These predate this audit and were left untouched. The requested audit report is the only file created for this task. |
| Clean checkout build | **NOT PASS / NOT RUN as a separate checkout** | Static inspection shows `HEAD` imports nonexistent `../lib/client`; working tree has the uncommitted correction. Current build result must not be attributed to an unmodified clean checkout. |
| Supabase connectivity, CRUD, RLS, triggers, RPC, or concurrency | **NOT VERIFIED** | No live database calls or SQL execution were performed. |
| Browser/device testing | **NOT RUN** | Build validates bundling, not visual responsiveness or user flows. |

## I. Final Verdict

**Partially complete - significant work remains.**

The repository is a buildable frontend with several real Supabase adapters and a meaningful subscription/billing foundation. Subscription/invoice pages, customer/product CRUD, authentication calls, role-aware route guards, schema source, and recurring invoice RPC code are present. The checked-in utility/integration suite passes.

It is **not ready for a final functional demonstration of the integrated system as a whole**: plans/quotations/tax configuration remain scaffolds; portal records are mock-backed; payment reconciliation can corrupt invoice balances; production-facing payment fallbacks can display demo rows; dashboard analytics are partly static and financially inaccurate; the schema workflow is destructive; and database deployment/RLS behavior has not been verified. Fix the Critical and High items, add safe migrations and staging evidence, then repeat database and browser tests before calling the system production-ready.

No application source, database, or environment file was modified or inspected for credential contents during this audit.
