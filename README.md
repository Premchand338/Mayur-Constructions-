# Mayur Command Center — Demo Prototype

**Mayur Command Center** is a functional client-presentation prototype built for **Mayur Constructions** (road construction operations across Bhiwandi, Thane, Palghar, Jawhar, and Shahapur in Maharashtra, India).

> **Demonstration Disclaimer:** All projects, vehicles, suppliers, staff names, documents, and ₹ financial figures are **fictional demonstration data** stored locally in browser `localStorage` for instant zero-setup offline walkthroughs. Simulated role switching is for demonstration only and does not represent production authentication.

---

## Architecture Overview

- **Frontend Stack:** React 19, TypeScript, Tailwind CSS v4, Radix UI primitives (`Dialog`, `Select`, `Tabs`), Recharts, React Hook Form + Zod validation, `date-fns`, and Lucide icons.
- **Relational Demo Engine (`src/store/demoStore.tsx`):**
  - Pre-seeded deterministic relational dataset (`src/data/seedData.ts`) with **8 government road projects**, **22 vehicles/machines** (odometer km vs engine hours), **26 raw materials**, **10 suppliers**, **11 government RA bills & receipts**, **18 diesel logs**, **12 trip logs**, **5 maintenance records**, **10 supplier invoices**, **35+ operational transactions**, **11 documents**, and an immutable **activity log**.
  - **Connected Atomic Workflows:**
    1. **Diesel Entry → Office Verification → Reports:** Recording diesel updates vehicle fuel totals, updates meter reading, flags unusual quantities/rates for review without assuming theft, links an operational expense (`Recorded`) to the assigned project, and adds it to the Office Admin verification queue.
    2. **Material Purchase vs Issue vs Transfer:** Purchases create inward stock + linked Supplier Invoices (without double-counting in project expenses); Site Issues enforce non-negative stock guards unless explicitly overridden; Site Transfers move stock between yards without falsely counting as consumption.
    3. **RA Bills & Receivables:** Tracks Contract Value, Gross Billed, Certified Value, 5% Retention, and Payments Received separately to compute live *Payment Aana Baaki*.
    4. **Tally-Ready CSV Demo:** Honest local CSV import/export demonstration with field mapping, duplicate `billRef` detection, and row-level validation.
- **Language Support:** Instant switching between **English + Hinglish** (default), **English**, and **हिंदी / मराठी (Devanagari)**.
- **Guided Client Presentation Tour:** 8-step interactive walkthrough covering all financial and operational workflows across roles.

---

## Setup & Run Commands

```bash
# 1. Install dependencies
npm install

# 2. Start development server (port 3000)
npm run dev

# 3. Type-check / Lint
npm run lint

# 4. Build production bundle
npm run build
```

---

## Implemented Features & Known Limitations

### Implemented
- Six core modules: **Overview**, **Projects**, **Vehicles**, **Materials**, **Finance**, **Documents**, plus **Owner Reports (9 live reports)**, **Approvals & Alerts**, **Activity History**, and **Roles & Settings**.
- Simulated 5-role switching (**Owner**, **Site Supervisor**, **Office Administrator**, **Accountant**, **Driver / Operator**) with role-scoped navigation and actions.
- Local PDF/Image document upload (`<= 2 MB`), preview modal, download, and expiry alerts.
- Filtered CSV exports across Finance and all 9 Owner Reports.
- One-click **Reset Demo Data** with confirmation modal.

### Known Limitations (Honest Scope)
- **Local Persistence:** Data persists in browser `localStorage` (`mayur_command_center_demo_v1`) rather than a remote multi-user SQL database.
- **Tally Integration:** Uses a realistic CSV import/export demonstration with validation and duplicate checking rather than a live Tally Prime XML/ODBC server connection.
- **File Uploads:** Stored locally as browser Data URLs capped at 2 MB per file for demonstration purposes.
