# Product Specs Index

An ERP system designed specifically for metal fabricators. It supports real production workflows, not accounting-driven workarounds. The focus is on job shops, make-to-order production, and compliance.

Key Features:

Manufacturing journal
Client journal
Access and user management
Metal cutting and nesting integration
Warehouse and product inventory
Financial reports
Analytics module
Minimal packing list document for transport (qty/weight only, no pricing)
: Generated as PDF/HTML from order view as `Packing List` (`packing-list` / `packing-slip` routes).
: Includes item quantity and weight totals only (no payment, tax, or price sections).
: Weight source priority: `item.total_weight` -> `item.weight` -> product `stock.weight` fallback.
: Localization follows global rules in `docs/design-docs/localization-guidelines.md`.
Production Workflow Support:

Job-based manufacturing processes
Real-time production tracking
Cost calculation and planning
Compliance management
- Worklog entries may be saved without color/coating after a warning confirmation.
- Order documents are blocked when the items table has unsaved edits; saving re-enables document generation.
