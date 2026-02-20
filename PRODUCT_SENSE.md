# Product Sense
# Why this product exists and how we think about it

## What problem we solve

Small and mid-size sheet metal fabrication factories have no software
built for them. Generic ERPs (SAP, Odoo) are too broad and require
expensive customization. Spreadsheets break at scale. We built tooling
that fits the exact workflow of a bending/roofing factory — from
parametric product configuration to factory floor logging to financial
export.

## Who we're building for (ranked by priority)

1. **Manager** — the daily power user. Everything flows through them.
   If the manager experience is slow or confusing, the business breaks.
2. **Factory Employee** — uses the system briefly but critically.
   Must be frictionless on mobile.
3. **Financial Officer** — high trust, low frequency. Needs accuracy
   above all else.
4. **Factory Owner** — low usage, high stakes. Needs consolidated truth,
   not raw data.
5. **Warehouse / Sales / Marketing** — supporting roles, features
   largely in development.

## Core product beliefs

- **The order is the atom.** Everything — manufacturing, payments,
  documents, analytics — orbits the order. If order creation is painful,
  nothing else matters.
- **Parametric > catalog.** Products aren't fixed SKUs. They're
  configurable shapes with formulas. The configurator (with 3D preview)
  is a core differentiator, not a feature.
- **WhatsApp is a first-class channel.** The workforce isn't desk-based.
  Auth, notifications, and communication must work where people already
  are.
- **Documents must be export-ready.** Waybills, invoices, and production
  slips are legal and operational artifacts. They must be correct,
  printable, and match Latvian regulatory requirements out of the box.
- **AI features are early warning, not reporting.** The goal isn't
  dashboards — it's surfacing problems (sales drops, low-margin orders,
  churning clients) before the owner notices them manually.

## What "done" looks like for a feature

- A manager can complete the workflow without asking anyone for help
- A factory employee can use it on a phone in under 30 seconds
- The data it produces is usable downstream (in reports, documents,
  accounting export) without manual cleanup
- It works in Latvian (and supports localization for other markets)

## What we deliberately don't do (yet)

- We don't build for multi-factory or multi-tenant scenarios
- We don't replace accounting software — we export to it (Moneo)
- We don't manage raw material procurement end-to-end
- We don't optimize production scheduling or machine utilization

## Product debt to watch

- Sales, marketing, and owner-facing analytics are almost entirely
  in development — the product is operationally strong but analytically
  thin today
- The public factory portal (articles, announcements, conversions) is
  partially built and needs a clear content strategy
- AI features are listed but none are shipped — this is a significant
  gap between the product vision and current reality

## North star metric

**Orders completed on time without manual intervention by the owner.**
Everything else — inventory accuracy, employee logging, financial
reconciliation — exists to make that number go up.