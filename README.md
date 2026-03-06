# Ramzan Invoice Management System

Invoice management for Ramzan Food Products: create invoices, send by email (PDF + shareable link), track due/paid/overdue, and record payments. Multi-staff logins with salesperson codes.

## Stack

- **Next.js 14** (App Router)
- **Firebase** (Firestore + Auth)
- **Resend** (email)
- **pdf-lib** (PDF generation)

## Setup

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Firebase**
   - Create a [Firebase project](https://console.firebase.google.com)
   - Enable **Firestore** and **Authentication** (Email/Password)
   - In Project settings > Service accounts, generate a new private key and copy the JSON
   - Set env: `FIREBASE_SERVICE_ACCOUNT_KEY` to the full JSON string (single line)
   - Set `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` from Project settings > General
   - Deploy Firestore rules: `firebase deploy --only firestore:rules` (optional; app uses Admin SDK so client can be locked down)

3. **Environment**
   - Copy `.env.example` to `.env`
   - Set Firebase vars as above
   - Set `RESEND_API_KEY` for sending invoices by email
   - Set `NEXT_PUBLIC_APP_URL` for shareable links (e.g. `http://localhost:3000`)

4. **Seed**
   ```bash
   npm run seed
   ```
   Seeds products and default company settings (and invoice counter) if empty.

5. **Run**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000. Register a user, then sign in.

## Scripts

- `npm run dev` – development server
- `npm run build` – production build (Next.js)
- `npm run seed` – seed Firestore (products, default settings, counter)
- `npm run preview` – build for Cloudflare and run locally (Wrangler)
- `npm run deploy` – build and deploy to Cloudflare Workers
- `npm run upload` – build and upload a new Worker version (no immediate deploy)
- `npm run cf-typegen` – generate Cloudflare env types

## Features

- **Auth**: Register / sign in (Firebase Auth email + password). Salesperson code per user (stored in Firestore `users`).
- **Settings**: Company name, tagline, address, phone, email, bank details, tax rate.
- **Products**: CRUD; seed loads sample frozen food products.
- **Customers**: CRUD with name, email, phone, address, default payment terms.
- **Invoices**: Create (customer, salesperson, line items), edit draft, download PDF, send by email (PDF + shareable link). Filters: All / Draft / Sent / Due / Overdue / Paid.
- **Payments**: Record payment (amount, method: account / cash / cheque); status updates to paid / partially paid.
- **Shareable link**: Customers open `/invoice/view?token=...` to view and download PDF (no login).

## Deploy

### Cloudflare Workers

The app includes [OpenNext](https://opennext.js.org/cloudflare) config for Cloudflare Workers (`wrangler.jsonc`, `open-next.config.ts`, `npm run preview` / `deploy` / `upload`). **Note:** The current OpenNext build can fail when bundling **Firebase Admin SDK** (and its dependency `jose`) for the Workers runtime. If you hit that error, use Vercel or another Node host (see below) until you upgrade to Next 15+ or Firebase/OpenNext add better Workers support.

If you deploy to Cloudflare successfully:
1. Install deps: `npm install --legacy-peer-deps`.
2. Set env in Cloudflare: **Workers & Pages** → your worker → **Settings** → **Variables**. Add `FIREBASE_SERVICE_ACCOUNT_KEY` (full JSON string), all `NEXT_PUBLIC_FIREBASE_*`, `RESEND_API_KEY`, and `NEXT_PUBLIC_APP_URL` (e.g. `https://ramzan-ims.<your-subdomain>.workers.dev`).
3. Deploy: `npm run deploy` (or connect a GitHub repo in Cloudflare for CI/CD).

Local preview in Workers runtime: `npm run preview`.

### Vercel / Node hosts (recommended for Firebase)

For a reliable production build with **Firebase Admin SDK**, use [Vercel](https://vercel.com) or any Node.js host. Add the same env vars (Firebase service account key as JSON string, all `NEXT_PUBLIC_FIREBASE_*`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`). No database server or migrations; Firestore and Firebase Auth are managed in the cloud.
