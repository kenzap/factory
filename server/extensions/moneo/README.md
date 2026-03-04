# Moneo Extension

## Purpose
This extension syncs Factory data with Moneo accounting.

Current focus:
- Sync client records (`entity`) to Moneo contacts.
- Store returned Moneo contact ID in local DB at `extensions.moneo.id`.

## Configuration
Defined in `manifest.json`:

- `MONEO_API_BASE`
- `MONEO_AUTH_TOKEN`
- `COMPANY_UID`
- `FIRM_ID`
- `MONEO_INSECURE_TLS` (optional, dev only)

`sync-ids` requires at least:
- `MONEO_API_BASE`
- `MONEO_AUTH_TOKEN`
- `COMPANY_UID`

TLS note:
- Preferred: set `MONEO_API_BASE` to a hostname that matches certificate SAN (for your log, use `https://kibo.moneo.lv/...` instead of raw IP).
- Temporary dev workaround: set `MONEO_INSECURE_TLS=true` to skip TLS cert validation in Moneo requests.

## Routes
Routes are registered in `index.js`.

Assuming extension base path is `/extension/moneo`:

- `GET /extension/moneo/sync-ids`
- `GET /extension/moneo/sync-old-ids`
- `GET /extension/moneo/sync-documents`

## API: `GET /sync-ids`
Synchronizes clients needed for accounting in the previous month.

Selection logic:
- Takes previous month range automatically (`from`/`to` in response).
- Finds `order` records where:
  - Waybill is printed: `waybill.number` exists and `waybill.date` is in previous month, or
  - Invoice is printed: `invoice.number` exists and `invoice.date` is in previous month.
- Excludes deleted/draft/transaction orders.
- Collects linked `entity` via `order.data.eid`.

Sync behavior:
- If `entity.extensions.moneo.id` already exists -> record is skipped.
- Otherwise:
  - Sends `contacts.contacts/create` to Moneo.
  - Reads returned ID.
  - Saves ID to `entity.js.extensions.moneo.id`.

### Dry Run
Preview without sending anything to Moneo and without DB updates:

- `GET /extension/moneo/sync-ids?dry_run=1`
- `GET /extension/moneo/sync-ids?dry_run=true`
- `GET /extension/moneo/sync-ids?dryRun=yes`

Optional limit:
- `GET /extension/moneo/sync-ids?limit=10`
- `GET /extension/moneo/sync-ids?dry_run=1&limit=10`

`limit` caps how many unsynced clients are processed for create in one call.
Already-synced clients are still scanned and returned as `skipped` and do not consume the limit.

Dry-run response:
- `dry_run: true`
- `pending`: clients that would be created in Moneo
- `skipped`: already synced
- `request_preview`: mapped payload row that would be sent to Moneo

### Response shape
Example fields:

```json
{
  "success": true,
  "dry_run": true,
  "limit": 10,
  "from": "2026-02-01T00:00:00.000Z",
  "to": "2026-02-28T23:59:59.999Z",
  "total": 12,
  "synced": 0,
  "skipped": 5,
  "pending": 7,
  "failed": 0,
  "data": [],
  "errors": []
}
```

## API: `GET /sync-documents`
Runs invoice/receipt synchronization flow.

Behavior:
- Uses previous month as synchronization period.
- Processes invoices first (orders with waybill and missing `extensions.moneo.invoiceid`).
- If no invoice candidates found, processes receipts (orders with payment date, existing `invoiceid`, and missing `receiptid`).
- Writes returned Moneo IDs to:
  - `extensions.moneo.invoiceid`
  - `extensions.moneo.receiptid`

Query params:
- `limit` (optional): max records per run for invoice or receipt stage.
  - Example: `GET /extension/moneo/sync-documents?limit=1`
- `dry_run` (optional): preview candidates and payloads without Moneo API calls or DB writes.
  - Example: `GET /extension/moneo/sync-documents?dry_run=1&limit=1`

## API: `GET /sync-old-ids`
Maps legacy Moneo IDs from `assets/clients.json` into current `entity` records.

Source:
- Reads `server/extension/moneo/assets/clients.json`.
- Uses each row from `data[2].data`.

Matching:
- Legacy `nosaukums` is matched (case-insensitive, trimmed) against current:
  - `entity.data.legal_name`, or
  - `entity.data.name`.

Write behavior:
- Reads legacy `extra.moneoid`.
- Updates `entity.js.extensions.moneo.id` when:
  - A single match is found, and
  - Current entity does not already have `extensions.moneo.id`.

Conflict handling:
- `unmatched`: no entity found.
- `ambiguous`: more than one entity matches the same name.
- `skipped`: already synced or missing source data.

Dry run:
- `GET /extension/moneo/sync-old-ids/?dry_run=1`

Response counters:
- `source_total`
- `updated` (or `pending` status in dry run)
- `skipped`
- `unmatched`
- `ambiguous`
- `errors`

## Outbound Moneo API Calls
Current real call in `sync-ids`:
- `POST {MONEO_API_BASE}/contacts.contacts/create/`
Current real calls in `sync-documents`:
- `POST {MONEO_API_BASE}/sales.invoices/create/`
- `POST {MONEO_API_BASE}/sales.receipts/create/`

Payload includes:
- `name`
- `customerflag`
- `address1`
- `vatno`
- `regnr`
- `country`
- `iban`
- `clientnumber`
- `vatpayer`
- `comment`

## Quick Examples

Dry run:

```bash
curl -s "http://localhost:3000/extension/moneo/sync-ids?dry_run=1"
```

Old IDs dry run:

```bash
curl -s "http://localhost:3000/extension/moneo/sync-old-ids/?dry_run=1"
```

Live sync:

```bash
curl -s "http://localhost:3000/extension/moneo/sync-ids"
```

Old IDs live sync:

```bash
curl -s "http://localhost:3000/extension/moneo/sync-old-ids/"
```
