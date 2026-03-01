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
Product manufacturing report
: Filters by employee, work type, start date, and end date.
: Shows product name, total manufactured quantity, and total allocated time.
: Rows are sorted alphabetically by product name.
Analytics menu
: Report links are grouped by category (Operations, Sales, Finance & Overview) for quicker access.
: Home page Analytics tile opens Analytics Menu (report hub) instead of opening a single report directly.
: Individual report links are shown only when the user has the corresponding report permission.
User rights updates
: Changing user rights updates active server session data so access changes apply without requiring re-login.
Files journal
: Home -> Files opens a journal of uploaded files (images, OBJ/MTL and other supported uploads).
: Supports file listing, search, size tracking, open/view, and delete actions.
Blog editor
: HTML mode -> live preview preserves DIV-based block markup more reliably by using Quill clipboard conversion with less restrictive block handling.
Production Workflow Support:

Job-based manufacturing processes
Real-time production tracking
Cost calculation and planning
Compliance management
- Worklog entries may be saved without color/coating after a warning confirmation.
- Order documents are blocked when the items table has unsaved edits; saving re-enables document generation.
- Cutting journal coating filter includes an `Others` tab that shows both `Client Material` and `Other` blocks.
- Manufacturing quick-work buttons (`M/L/K/N/G`) can open Work Log with grouped items by product title from the same order; Work Log presents a popup to select all or specific grouped products and create multiple records in one action.
- Feedback request automation
: Every 15 minutes, backend cron claims one order created at least 7 days ago with no `email_ask_feedback` flag and sends a client feedback request email.
: Subject/body uses Settings -> Templates keys `ask_feedback_order_client_email_subject` and `ask_feedback_order_client_email_template` with placeholders like `{{order_id}}`, `{{review_link}}`, and `{{client_first_name}}`.
