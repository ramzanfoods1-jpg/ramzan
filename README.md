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
- `npm run build` – production build
- `npm run seed` – seed Firestore (products, default settings, counter)

## Features

- **Auth**: Register / sign in (Firebase Auth email + password). Salesperson code per user (stored in Firestore `users`).
- **Settings**: Company name, tagline, address, phone, email, bank details, tax rate.
- **Products**: CRUD; seed loads sample frozen food products.
- **Customers**: CRUD with name, email, phone, address, default payment terms.
- **Invoices**: Create (customer, salesperson, line items), edit draft, download PDF, send by email (PDF + shareable link). Filters: All / Draft / Sent / Due / Overdue / Paid.
- **Payments**: Record payment (amount, method: account / cash / cheque); status updates to paid / partially paid.
- **Shareable link**: Customers open `/invoice/view?token=...` to view and download PDF (no login).

## Deploy

Use Vercel (or similar). Add env vars (Firebase service account key as JSON string, and all `NEXT_PUBLIC_FIREBASE_*`). No database server or migrations; Firestore and Firebase Auth are managed in the cloud.
