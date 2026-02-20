# Quality Score
# How we define and measure quality in this codebase

## What quality means here

Quality is not just bug-free code. It means:
- A manager can create an order without errors or confusion
- Factory employees can log work in under 30 seconds
- Documents generated are legally compliant and print-ready
- Financial data matches what accounting software receives
- The system behaves consistently across Latvian and other locales

---

## Code quality signals

### Green flags
- Formula evaluation (width/length/price) produces consistent results
  across order creation, editing, and document export
- Status transitions follow the defined order lifecycle and never
  leave an order in an ambiguous state
- API responses are uniform — same envelope shape, same error format
- New features don't require changes to document templates

### Red flags
- Price shown in the UI differs from price on the generated invoice
- An order status can be set to an illogical state (e.g. Dispatched
  before Manufactured)
- A new coating/color added to settings doesn't appear in the
  product configurator automatically
- Duplicate client records appear in final reports
- Wrong time, currency or measurment conversions
- Employee work logs reference a work category that no longer exists

---

## Feature acceptance criteria

A feature is considered complete when:

1. **Happy path works** — the primary user workflow completes without errors
2. **Data integrity holds** — downstream records (documents, reports,
   accounting export) reflect the change correctly
3. **Localization is not broken** — UI strings are not hardcoded in Latvian
   or any single language
4. **Mobile is not degraded** — factory employee and manager flows
   work on a phone screen
5. **No silent failures** — errors surface to the user or are logged;
   nothing fails invisibly

---

## Known quality risks (watch list)

| Area | Risk | Severity |
|---|---|---|
| Formula pricing | Edge cases with zero dimensions or missing inputs | High |
| Document templates | Mustache variables silently render empty if key missing | High |
| Status transitions | No enforced state machine — logic lives in UI only | Medium |
| Texture/coating sync | Price table and texture array can diverge | Medium |
| VAT calculation | Tax percent pulled from settings, not locked to order | Medium |
| Work categories | Deletions not validated against existing employee logs | Low |

---

## What we don't measure (and why)

- **Test coverage %** — we don't have a formal test suite yet; 
  manual QA on critical paths is the current standard
- **Performance benchmarks** — not a current bottleneck at this scale
- **Accessibility score** — noted as future work; not actively tracked

---

## Definition of a regression

Any change that causes:
- A previously working order to display incorrect pricing
- A generated document to lose required fields
- A user role to gain or lose access unintentionally
- WhatsApp or email notifications to stop firing on order events
- Misalligned UI elements