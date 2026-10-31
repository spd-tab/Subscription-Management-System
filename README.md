# Brightloop — Subscription Management System

Brightloop is a responsive React/Vite foundation for a subscription-management workspace. The dashboard, customers, subscriptions, and invoices screens follow the supplied Stitch exports; other requested areas have working routes and modular demo surfaces for a hackathon team to extend.

## Stack

- React 18 and Vite
- JavaScript / JSX
- Tailwind CSS (with a small design-token configuration) and responsive application styles
- React Router DOM
- Lucide React
- Recharts
- Supabase JavaScript client (optional until credentials are configured)

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

On Windows, copy `.env.example` to `.env` manually or run `Copy-Item .env.example .env`. Add the Supabase project URL and anon key to `.env` when available. The app deliberately remains usable without these values. Never commit `.env`.

## Commands

- `npm run dev` — start local development
- `npm run build` — create a production build
- `npm run preview` — preview the production build

## Routes

- Auth: `/login`, `/register`, `/forgot-password`
- Admin: `/admin/dashboard`, `/admin/customers`, `/admin/products`, `/admin/plans`, `/admin/quotations`, `/admin/quotation-templates`, `/admin/subscriptions`, `/admin/invoices`, `/admin/payments`, `/admin/discounts`, `/admin/taxes`, `/admin/reports`, `/admin/team`, `/admin/settings`
- Record details: `/admin/customers/:id`, `/admin/products/:id`, `/admin/subscriptions/:id`, `/admin/invoices/:id`
- Customer portal: `/portal/dashboard`, `/portal/subscriptions`, `/portal/invoices`, `/portal/payments`

Auth guards are in place, restricting access based on roles (admin, staff, customer) using Supabase authentication. Auth forms are integrated with Supabase Auth functions.

## Structure

```text
src/
  components/
    common/       Reusable controls, states, table, badges, modal, pagination
    layouts/      Admin, customer portal, auth layout, development auth guard
  data/           Shared realistic demo data
  pages/           Reference screens, auth pages, and modular page scaffold
  routes/          React Router route tree
  services/
    supabase/      Environment-aware Supabase client
  App.jsx
  main.jsx
```

The original Stitch HTML, screenshots, and `DESIGN.md` are kept in `stitch_brightloop_subscription_platform/` as source references. The dashboard, customer, subscription, and invoice pages include interactive search, filters, cards, and demo forms. Demo submissions do not claim server persistence.

## Suggested ownership

- Member 1: Dashboard, analytics, reports
- Member 2: Customers, products, variants, plans, quotations, tax configuration
- Member 3: Subscriptions, lifecycle, billing engine, invoice generation and management
- Member 4: Authentication, roles, payments, discounts, customer portal, integration

Shared mock data lives in `src/data/mockData.js`; reusable interface primitives live in `src/components/common/`. Keep business logic and server queries in feature services rather than adding them to `App.jsx`.

## Collaboration

See [TEAM_DEVELOPMENT.md](./TEAM_DEVELOPMENT.md) for the step-by-step Windows/PowerShell GitHub workflow, branch assignments, Pull Request process, and conflict-resolution instructions.

1. Pull the latest `main` before creating a short-lived feature branch.
2. Keep changes scoped to your feature folder; coordinate shared component changes.
3. Use descriptive commits and open a pull request for review.
4. Run `npm run build` before merging.
5. Do not commit credentials, `.env`, `node_modules`, or generated `dist/` output.

## Current backend state

`src/services/supabase/client.js` creates a client only when both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are provided. The database schema is defined in `supabase_schema.sql`, and backend integration for various modules is in progress. Some pages may still use local mock data if Supabase is not fully configured or integrated.
