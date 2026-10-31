# Brightloop — Subscriptions & Billing Integration Contract & Backend Report

> **Prepared for:** Member 3 (Subscriptions, Billing Engine & Invoicing)  
> **Prepared by:** Member 4 (Authentication, Payments, Database & Integration)  
> **Target Database:** Supabase PostgreSQL (`https://wyvkbwlhjgkvfibftwej.supabase.co`)  
> **Migration Source:** [`supabase_schema.sql`](./supabase_schema.sql)  
> **Currency:** INR (`NUMERIC(12,2)`) | **Primary Keys:** UUID (`gen_random_uuid()`)

---

## 1. Database Structure

All 18 tables specified in the contract have been implemented and deployed.

### Table Relationship Map
```text
auth.users ──1:1──> profiles ──1:1(opt)──> customers
                                             │
                      ┌──────────────────────┴────────────────────────┐
                      ▼                                                ▼
                 quotations ──1:N──> quotation_items              subscriptions
                      │                                                │
                      │                                                ├──1:N──> sub_items
                      ▼                                                ▼
                    plans ──1:N──> plan_items ◄── tax_rates        invoices
                      ▲                                                │
                      │                                                ├──1:N──> inv_items
                   products ──1:N──> product_variants                  ├──1:N──> inv_discounts ◄── discounts
                                                                       ▼                │
                                                                    payments            └──1:N──> disc_products
```

### Table Definitions & Constraints

#### A. Identity & Customers (M4 / M2)
1. **`public.profiles`**
   - `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
   - `full_name TEXT NOT NULL DEFAULT ''`
   - `email TEXT NOT NULL DEFAULT ''`
   - `role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'staff', 'customer'))`
   - `avatar_url TEXT`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

2. **`public.customers`**
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `auth_user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL` *(nullable — permits offline customers)*
   - `name TEXT NOT NULL`
   - `email TEXT NOT NULL UNIQUE`
   - `phone TEXT`, `billing_address TEXT`
   - `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`

#### B. Catalog, Plans & Taxes (M2)
3. **`public.products`**: `id UUID PK`, `name TEXT`, `type TEXT DEFAULT 'service'`, `sales_price NUMERIC(12,2)`, `cost_price NUMERIC(12,2)`, `notes TEXT`, `is_active BOOLEAN DEFAULT TRUE`, audit timestamps.
4. **`public.product_variants`**: `id UUID PK`, `product_id UUID FK products(id) ON DELETE CASCADE`, `name TEXT`, `price_modifier NUMERIC(12,2)`, `is_active BOOLEAN DEFAULT TRUE`, `created_at`.
5. **`public.tax_rates`**: `id UUID PK`, `name TEXT` (e.g., 'GST 18%'), `rate_percent NUMERIC(5,2)`, `is_active BOOLEAN DEFAULT TRUE`, `created_at`.
6. **`public.plans`**: `id UUID PK`, `name TEXT`, `billing_interval TEXT CHECK (billing_interval IN ('daily', 'weekly', 'monthly', 'yearly'))`, `interval_count INTEGER DEFAULT 1`, `minimum_quantity INTEGER DEFAULT 1`, `available_from DATE`, `available_until DATE`, `auto_close BOOLEAN DEFAULT FALSE`, `is_active BOOLEAN DEFAULT TRUE`, audit timestamps.
7. **`public.plan_items`**: `id UUID PK`, `plan_id UUID FK plans(id) ON DELETE CASCADE`, `product_id UUID FK products(id) ON DELETE RESTRICT`, `variant_id UUID FK product_variants(id) ON DELETE SET NULL`, `quantity NUMERIC(12,2) DEFAULT 1.00`, `unit_price NUMERIC(12,2)`, `tax_rate_id UUID FK tax_rates(id) ON DELETE SET NULL`.

#### C. Quotations (M2)
8. **`public.quotation_templates`**: `id UUID PK`, `name TEXT`, `validity_days INTEGER DEFAULT 30`, `terms TEXT`, `is_active BOOLEAN DEFAULT TRUE`, `created_at`.
9. **`public.quotations`**: `id UUID PK`, `quotation_number TEXT UNIQUE`, `customer_id UUID FK customers(id) ON DELETE RESTRICT`, `template_id UUID FK quotation_templates(id)`, `status TEXT CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired'))`, `issue_date DATE`, `valid_until DATE`, `subtotal NUMERIC(12,2)`, `tax_amount NUMERIC(12,2)`, `total_amount NUMERIC(12,2)`, audit timestamps.
10. **`public.quotation_items`**: `id UUID PK`, `quotation_id UUID FK quotations(id) ON DELETE CASCADE`, `product_id UUID FK products(id) ON DELETE RESTRICT`, `variant_id UUID FK product_variants(id)`, `description TEXT`, `quantity NUMERIC(12,2)`, `unit_price NUMERIC(12,2)`, `tax_rate_percent NUMERIC(5,2)`, `amount NUMERIC(12,2)`.

#### D. Subscriptions & Subscription Items (M3)
11. **`public.subscriptions`**
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `subscription_number TEXT NOT NULL UNIQUE`
    - `customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT`
    - `plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT`
    - `quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL`
    - `status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed'))`
    - `start_date DATE NOT NULL DEFAULT CURRENT_DATE`, `end_date DATE`
    - `next_billing_date DATE`
    - `billing_interval TEXT NOT NULL CHECK (billing_interval IN ('daily', 'weekly', 'monthly', 'yearly'))`
    - `interval_count INTEGER NOT NULL DEFAULT 1`
    - `payment_terms_days INTEGER NOT NULL DEFAULT 15`
    - `currency CHAR(3) NOT NULL DEFAULT 'INR'`
    - `auto_close BOOLEAN NOT NULL DEFAULT FALSE`
    - `paused_at TIMESTAMPTZ`, `closed_at TIMESTAMPTZ`
    - `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`

12. **`public.subscription_items`**
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE`
    - `product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT`
    - `variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL`
    - `description TEXT`
    - `quantity NUMERIC(12,2) NOT NULL DEFAULT 1.00`
    - `unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00`
    - `tax_rate_id UUID REFERENCES public.tax_rates(id) ON DELETE SET NULL`
    - `tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00`

#### E. Invoices & Invoice Items (M3)
13. **`public.invoices`**
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `invoice_number TEXT NOT NULL UNIQUE`
    - `customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT`
    - `subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL`
    - `billing_period_start DATE`, `billing_period_end DATE`
    - `issue_date DATE NOT NULL DEFAULT CURRENT_DATE`, `due_date DATE NOT NULL`
    - `status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'paid', 'cancelled'))`
    - `currency CHAR(3) NOT NULL DEFAULT 'INR'`
    - `subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00`
    - `discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
    - `tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
    - `total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
    - `amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00`
    - `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`

14. **`public.invoice_items`**
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE`
    - `product_id UUID REFERENCES public.products(id) ON DELETE SET NULL`
    - `variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL`
    - `description TEXT`
    - `quantity NUMERIC(12,2) NOT NULL DEFAULT 1.00`
    - `unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00`
    - `subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00`
    - `discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
    - `taxable_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
    - `tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00`
    - `tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
    - `total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`

#### F. Discounts & Invoice Discounts (M4 / M3)
15. **`public.discounts`**: `id UUID PK`, `name TEXT`, `code TEXT UNIQUE`, `discount_type TEXT CHECK (discount_type IN ('fixed', 'percentage'))`, `value NUMERIC(12,2)`, `minimum_purchase NUMERIC(12,2) DEFAULT 0.00`, `minimum_quantity NUMERIC(12,2) DEFAULT 1.00`, `starts_at TIMESTAMPTZ`, `ends_at TIMESTAMPTZ`, `usage_limit INTEGER`, `usage_count INTEGER DEFAULT 0`, `applies_to TEXT CHECK (applies_to IN ('product', 'subscription', 'both'))`, `is_active BOOLEAN DEFAULT TRUE`, audit timestamps.
16. **`public.discount_products`**: `id UUID PK`, `discount_id UUID FK discounts`, `product_id UUID FK products`, `UNIQUE(discount_id, product_id)`.
17. **`public.invoice_discounts`**: `id UUID PK`, `invoice_id UUID FK invoices ON DELETE CASCADE`, `discount_id UUID FK discounts ON DELETE RESTRICT`, `applied_amount NUMERIC(12,2)`.

#### G. Payments (M4)
18. **`public.payments`**: `id UUID PK`, `payment_number TEXT UNIQUE`, `invoice_id UUID FK invoices ON DELETE RESTRICT`, `amount NUMERIC(12,2)`, `payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'UPI', 'cheque', 'other'))`, `payment_date TIMESTAMPTZ DEFAULT NOW()`, `reference TEXT`, `note TEXT`, `status TEXT CHECK (status IN ('paid', 'confirmed', 'pending', 'failed', 'refunded'))`, `recorded_by UUID FK profiles(id)`, `created_at`.

---

## 2. Authentication, Roles & Security (RLS)

- **Authentication Method:** Supabase standard email/password authentication (`auth.users`).
- **Profile Auto-Creation & Linking Trigger (`handle_new_user`):**
  When a user signs up:
  1. Profile is created in `public.profiles` with `role = COALESCE(user_metadata.role, 'customer')`.
  2. If a record already exists in `public.customers` matching `email = NEW.email` with `auth_user_id IS NULL`, it automatically sets `customers.auth_user_id = NEW.id`.
- **Role Hierarchy:**
  - `admin`: Full administrative access to all tables.
  - `staff`: Operational access (can view, create, and update customers, catalog, quotations, subscriptions, invoices, discounts, payments).
  - `customer`: Restricted via Row Level Security (RLS) to read-only access to their own customer profile, quotations, subscriptions, invoices, and payments.
- **RLS Helper Functions:**
  - `public.get_user_role() RETURNS TEXT`: returns current user's role from `profiles`.
  - `public.is_admin_or_staff() RETURNS BOOLEAN`: returns `TRUE` if role is `admin` or `staff`.
  - `public.get_customer_id() RETURNS UUID`: returns `customers.id` where `customers.auth_user_id = auth.uid()`.

---

## 3. Subscriptions & Billing Engine Integration (For Member 3)

### Critical Billing Constraint: Duplicate Prevention
The database strictly prevents duplicate subscription invoices for the same period with a partial unique index:
```sql
CREATE UNIQUE INDEX unique_subscription_billing_period
ON public.invoices (
  subscription_id,
  billing_period_start,
  billing_period_end
)
WHERE subscription_id IS NOT NULL;
```

### Lifecycle Status Values
- **Subscriptions:** `draft` ➔ `quotation` ➔ `confirmed` ➔ `active` ➔ `closed` (operational: `paused`).
  - Only `active` subscriptions should be billed.
  - Eligibility rule: `status = 'active' AND next_billing_date <= CURRENT_DATE`.
- **Invoices:** `draft` ➔ `confirmed` ➔ `paid` (alternative: `cancelled`).

### Totals, Taxes & Discount Snapshot Rules
1. When generating a subscription invoice, **always snapshot the line item values** into `invoice_items` (`unit_price`, `quantity`, `tax_rate_percent`, `discount_amount`, `total_amount`).
2. Never reference live product prices on existing invoices, as catalog prices may change in the future.
3. If a promotional discount was applied to the invoice, insert a record into `public.invoice_discounts (invoice_id, discount_id, applied_amount)`. The database trigger automatically increments `discounts.usage_count`.

---

## 4. Discounts & Payments Automation

1. **Automatic Invoice Payment Reconciliation:**
   The trigger `handle_payment_applied` listens on `AFTER INSERT ON public.payments`:
   - It automatically executes:
     ```sql
     UPDATE public.invoices
     SET amount_paid = amount_paid + NEW.amount,
         status = CASE WHEN (amount_paid + NEW.amount) >= total_amount THEN 'paid' ELSE status END,
         updated_at = NOW()
     WHERE id = NEW.invoice_id;
     ```
2. **Partial Payments:** Fully supported. The outstanding balance for any invoice is calculated as:
   `outstanding_balance = total_amount - amount_paid`.
3. **Discount Usage Counter:**
   The trigger `handle_invoice_discount_applied` on `AFTER INSERT ON public.invoice_discounts` increments `discounts.usage_count + 1`.

---

## 5. Database Triggers & Stored Functions

| Function Name | Type | Description |
|---|---|---|
| `handle_new_user()` | Trigger on `auth.users` (`AFTER INSERT`) | Auto-creates `profiles` row; auto-links customer by email. |
| `handle_payment_applied()` | Trigger on `public.payments` (`AFTER INSERT`) | Increments `invoices.amount_paid` and marks `status = 'paid'` if balance reaches 0. |
| `handle_invoice_discount_applied()` | Trigger on `public.invoice_discounts` (`AFTER INSERT`) | Increments `discounts.usage_count`. |
| `get_user_role()` | `SECURITY DEFINER` function | Returns current user role for RLS. |
| `is_admin_or_staff()` | `SECURITY DEFINER` function | Returns `TRUE` if user is staff or admin. |
| `get_customer_id()` | `SECURITY DEFINER` function | Maps `auth.uid()` to `customers.id` for portal queries. |

---

## 6. Frontend Integration Guidelines for Member 3

### Required Environment Variables
Add these to your local `.env` file (matches `.env.example`):
```env
VITE_SUPABASE_URL=https://wyvkbwlhjgkvfibftwej.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_H-wvzLQ_P4Q3LCMAzvjDJw_eMRuCXyF
```

### Existing Services & Client Conventions
- **Client export:** `import { supabase, isSupabaseConfigured } from '../services/supabase/client'`
- **Query conventions:** Follow the structure in `src/services/supabase/queries.js`.
- **Relational Joins:**
  To fetch an invoice with its customer and subscription:
  ```javascript
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(id, name, email, billing_address),
      subscription:subscriptions(id, subscription_number, plan:plans(name)),
      items:invoice_items(*),
      payments:payments(*)
    `)
    .order('issue_date', { ascending: false });
  ```

---

## 7. Migration File & Local Setup

- The complete SQL migration file is stored in your workspace at [`supabase_schema.sql`](./supabase_schema.sql).
- It is idempotent and starts with a clean `DROP TABLE ... CASCADE` block, allowing you to re-run it in any new Supabase project without foreign key or column conflicts.
- It comes pre-seeded with realistic Indian GST tax rates, products, starter/growth plans, active subscriptions, invoices, and payments.
