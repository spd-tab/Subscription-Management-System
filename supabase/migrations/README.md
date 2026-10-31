# Brightloop — Safe Database Migration Strategy

This directory contains incremental, non-destructive PostgreSQL migrations for the Brightloop Subscription Management System deployed on Supabase.

> **CRITICAL RULE:** Never execute `DROP TABLE ... CASCADE` or `TRUNCATE` against the shared or production Supabase database. All migrations in this folder are carefully guarded and additive.

---

## Migration Index

| Order | File | Purpose | Destruction Risk |
|---|---|---|---|
| **001** | `20261031_000001_initial_schema.sql` | Safe additive schema baseline (`CREATE TABLE IF NOT EXISTS`) | None (Preserves all existing data) |
| **002** | `20261031_000002_payment_reconciliation.sql` | Overhauls `handle_payment_change` trigger; only `paid`/`confirmed` payments increment `amount_paid`; handles updates, refunds & deletes | None (Repairs existing invoice balances) |
| **003** | `20261031_000003_recurring_billing_rpc.sql` | Hardens `generate_recurring_invoices` with `FOR UPDATE` row-locking, `is_admin_or_staff()` caller authorization, and duplicate prevention | None (Safe idempotent function replacement) |
| **004** | `20261031_000004_security_hardening.sql` | Prevents self-escalation on signup (`role = 'customer'`) and restricts `profiles` UPDATE RLS to prevent unauthorized role escalation | None (Secures policy checks) |

---

## How to Apply Migrations to Supabase

### Option A: Via Supabase SQL Editor (Recommended for Hackathon)
1. Sign in to the Supabase Project Dashboard (`https://supabase.com/dashboard/project/wyvkbwlhjgkvfibftwej`).
2. Navigate to **SQL Editor**.
3. Open and run each migration in numerical order:
   - Run `20261031_000001_initial_schema.sql`
   - Run `20261031_000002_payment_reconciliation.sql`
   - Run `20261031_000003_recurring_billing_rpc.sql`
   - Run `20261031_000004_security_hardening.sql`
4. Confirm "Success. No rows returned" for each query.

### Option B: Via Supabase CLI
```bash
supabase db push
```

---

## Rollback & Safety Checklist

- [x] All `CREATE TABLE` statements use `IF NOT EXISTS`.
- [x] All triggers check for existing instances before creating (`DROP TRIGGER IF EXISTS`).
- [x] All policy replacements drop only the specific policy name being replaced.
- [x] The payment reconciliation migration includes an idempotent repair block that recalculates `amount_paid` for all existing invoices based on actual completed payments.
- [x] No `DROP COLUMN` or `DROP TABLE` statements exist in this sequence.

