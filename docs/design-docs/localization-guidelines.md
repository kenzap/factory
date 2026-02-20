# Localization Guidelines

Localization rules are global for the whole product, not per feature.

## Scope

- All user-facing strings in frontend UI.
- All user-facing strings rendered from backend templates/documents.
- All generated HTML/PDF content shown to end users.

## Rules

- Frontend strings must use `__html('...')`.
- Backend-rendered strings must use `__html(locale, '...')`.
- Do not hardcode user-facing labels in English (or any single locale) unless intentionally non-localizable.
- New features must follow the same localization pattern by default.

## Documents

- Invoice, waybill, quotation, production slip, packing list, and any future document templates follow the same localization rules.
