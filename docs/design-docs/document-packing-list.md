# Document Packing List

Server-generated transport document intended for loading/delivery operations, available as HTML or PDF.

## Purpose

- Provide a minimal packing summary for transport.
- Exclude all payment-related data (prices, discounts, tax, totals to pay).
- Show only operational shipment information.

## Route And Access

- Primary route: `/document/packing-list/?id=<order_id>`
- Backward-compatible alias: `/document/packing-slip/?id=<order_id>`
- Triggered from Order view document actions as **Packing List**.

## Table Structure

Columns:
- Product
- Size
- Quantity
- Unit
- Weight (kg)

Totals row:
- Total quantity
- Total weight (kg)

No monetary columns or monetary totals are rendered.

## Localization

Follows global localization rules in `docs/design-docs/localization-guidelines.md`.

## Weight Resolution

Weight is resolved per item using this priority:
1. `item.total_weight`
2. `item.weight`
3. Product fallback: `product.data.stock.weight` fetched by item product id

This ensures missing order-item weight can still be rendered from product master data.
