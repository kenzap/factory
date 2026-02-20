# Plans
# Roadmap and development priorities

## Current focus (active)

- Complete notification system for inventory shortages
- Complete notification system of order lifecycle
- Sales representative reports and product analytics
- Video and textual embeds that provide hints and describe ERP functionality
- Embedded AI dev module that can extend some ERP's features in production. Example, generate custom PDF report for particular product line based on user prompt.

## Next up

- Live compliance
 - Sync with local regulatory database for on the fly compliance checks
- Factory owner dashboard
  - Financial reports
  - Customer review consolidation
  - Performance and efficiency metrics
  - Custom yearly report generation
- AI features (first wave)
  - Sales drop warnings per product line
  - Low profitability order alerts
  - Identification of clients reducing orders
  - Monthly consolidated AI report for owner

## Backlog (decided, not scheduled)

- Proforma document template (Live library of different template designs or AI generated)
- Package slip document template (currently empty)
- Sales funnel and site ergonomics analysis for marketing
- Top-performing sales AI reports

## Technical debt backlog

- Implement server side updates in all journals when order or item state changes on the server
- Fix font-face filename mismatch (Poppins declared, Roboto filenames)
- Standardize created/updated timestamps — currently duplicated
  in both data and meta envelopes on some records
- Assign proper IDs to coating price entries (several have empty id)

## Decisions made (not changing)

- WhatsApp remains a first-class auth and notification channel
- An extension. We export to accounting (Moneo), we do not replace it
- Document templates stay as HTML strings in settings —
  no separate template file system
- Pricing stays formula-based, not fixed catalog
- Bootstrap 5.3 remains the UI base — no migration planned

## Out of scope (for now)

- Multi-factory / multi-tenant support in demo cloud acount
- Raw material procurement management
- Production scheduling and machine utilization optimization

## Recently completed

- Core order lifecycle (create, status transitions, documents)
- Parametric product configurator with 3D preview
- WhatsApp + Email 2FA authentication
- Invoice, waybill, quotation, production slip generation
- Financial payment mapping and accounting export
- Employee work logging and performance reports
- Inventory management and supplier records
- Role-based access control and API key management
- Multi-language platform support