# Kenzap Factory

![Factory](https://raw.githubusercontent.com/kenzap/factory/main/preview.png)

**About**: Manufacturing resource planning and quotation software. Production, costing, estimation and planning designed for job-based manufacturing.

**Stack:**
- PostgreSQL
- Redis
- Node.js
- ES6 JavaScript

**Demo:** https://kenzap.com

## What is "Kenzap Factory"?

An ERP system designed specifically for metal fabricators. It supports real production workflows. The focus is on job shops, make-to-order production, and compliance.

**Key Features:**
- Manufacturing journal
- Client journal
- Access and user management
- Metal cutting and nesting integration
- Warehouse and product inventory
- Financial reports
- Analytics module

**Production Workflow Support:**
- Job-based manufacturing processes
- Real-time production tracking
- Cost calculation and planning
- Compliance management

## User Journey

Below is a comprehensive overview of user workflows within this ERP system. Items marked with "-" are currently in development.

### General User
- Securely log in to the platform using WhatsApp or Email (2FA) ✓
- Change platform language ✓
- Navigate seamlessly across the platform ✓

### Manager
- Create new orders ✓
- Access order logs ✓
- Manage client records ✓
- Monitor manufacturing status ✓
- Add and edit products ✓
- Create product listings and localizations ✓
- Customize coatings ✓
- Update pricing ✓
- Change order statuses (Draft, Manufactured, Dispatched, etc.) ✓
- Set manufacturing due dates ✓
- Set public announcements on factory portal -

### Warehouse Owner
- Update product inventory ✓
- Write off material supplies ✓
- Add product suppliers ✓
- Generate employee performance reports ✓
- Receive notifications about inventory shortages -

### Factory Employee
- Log daily activities ✓
- Report completed work operations ✓

### Administrator
- Add users to the platform ✓
- Manage user access rights ✓
- Connect to the platform via API and manage API keys ✓
- Access database and file storage data ✓

### Financial Officer
- Map incoming payments with orders ✓
- Generate financial reports ✓
- Export receipts and waybill data to accounting software ✓
- View individual client balances in PDF format ✓

### Sales Representative
- Generate sales reports -
- Access product analytics (top-selling products, trending, declining) -
- View total number of products sold ✓

### Marketing Specialist
- Create and publish articles to the factory portal ✓
- Track conversions and site metrics -
- Analyze online sales funnels and site ergonomics -

### Factory Owner
- Access financial reports -
- View consolidated customer review reports -
- Receive AI-generated monthly reports on production trends -
- View performance and efficiency metrics -
- Generate custom yearly reports -

**AI-Powered Features:**

This will start all required services including PostgreSQL, Redis, and the Node.js application.

- Sales drop warnings for specific product lines -
- Low profitability order notifications -
- Identification of companies reducing or stopping orders -
- Top-performing sales reports -
- Consolidated monthly updates for core metrics -

## Development

### Quick Start
To launch the ERP system locally:

```bash
docker-compose up
```

To launch the ERP system in production with https proxy:

```bash
docker-compose --profile production up -d
```

This will create 5 containers: Redis, Node.js, PostgreSQL, SeaweedFS and Adminer (for managing PostgreSQL data). Demo data is installed automatically from:

- `docs/generated/dumps/postgres/data.sql`
- `docs/generated/dumps/s3/kenzap-private/*`
- `docs/generated/dumps/s3/kenzap/*`

PostgreSQL restore notes:

- The dump should be generated with `pg_dump` (not Adminer export) to keep pgvector definitions valid.
- Export the current running Postgres container into the dump file:

```bash
npm run export:db
```

Optional flags:

```bash
# custom output file
npm run export:db -- --out=docs/generated/dumps/postgres/data.sql

# custom container / db / user
npm run export:db -- --container=postgres --db=cloud --user=postgres

# export as INSERT statements
npm run export:db -- --inserts
```

You can access PostgreSQL with the default password `password123`:

```bash
http://localhost:8080/?pgsql=local_postgres&username=postgres&db=cloud&ns=public
```

To open ERP dashboard

```bash
http://localhost:3000/home/
```

### Production HTTPS (VM)

Use the `production` profile to run Node behind Caddy with automatic TLS certificates:

```bash
docker compose --profile production up -d --build
```

Required `.env` variables for TLS:

```bash
APP_DOMAIN=erp.your-domain.com
LETSENCRYPT_EMAIL=ops@your-domain.com
PUBLIC_FILES_BASE_URL=https://erp.your-domain.com
NODE_ENV=production
```

Notes:

- Expose only `80` and `443` publicly on VM firewall/security group.
- `docker-compose.yaml` keeps Caddy under the `production` profile and switches Node to `npm run start` when `NODE_ENV=production`.
- Keep `S3_ENDPOINT` internal (`http://seaweedfs:8333`).

### Storage Provider

File APIs support two storage providers selected by environment variable:

```bash
STORAGE_PROVIDER=s3   # default, works with AWS S3-compatible backends
# STORAGE_PROVIDER=oss
```

For local S3-compatible storage via SeaweedFS (`docker-compose` service name `seaweedfs`):

```bash
S3_ENDPOINT=http://seaweedfs:8333
S3_REGION=us-east-1
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_BUCKET=kenzap
S3_FORCE_PATH_STYLE=true
# Optional absolute base for returned file URLs:
# PUBLIC_FILES_BASE_URL=https://my_domain_name
```

SeaweedFS object restore on first launch:

- Put object dump files under `docs/generated/dumps/s3/` using one of these layouts:
  - `docs/generated/dumps/s3/<S3_BUCKET>/...` (recommended)
  - `docs/generated/dumps/s3/...` (files mirrored directly into `<S3_BUCKET>`)
  - optional private bucket: `docs/generated/dumps/s3/<S3_BUCKET_PRIVATE>/...`
- `docker-compose.yaml` runs `s3-seed` which creates buckets and mirrors files into SeaweedFS.
- macOS/system metadata files are ignored during import (for example `.DS_Store`, `._*`).
- Object restore runs only once per storage volume. A marker file `/data/.seeded-from-dump` is created in the volume.
- Changing files in `docs/generated/dumps/s3/` will not re-import unless you reset seed state.
- To re-initialize both PostgreSQL and CloudServer from dumps, remove volumes and restart:

```bash
docker compose down -v
docker compose up
```

Re-run S3 seed without deleting all volumes:

```bash
docker compose run --rm --entrypoint /bin/sh s3-seed -c "rm -f /data/.seeded-from-dump"
docker compose up
```

Export current S3 buckets into dump folder:

```bash
npm run export:buckets
```

Optional flags:

```bash
# custom output directory
npm run export:buckets -- --out=docs/generated/dumps/s3

# custom endpoint (default uses host.docker.internal + S3_PORT)
npm run export:buckets -- --endpoint=http://localhost:9000

# export only public bucket
npm run export:buckets -- --no-private
```

For Alibaba OSS:

```bash
OSS_REGION=oss-<region>
OSS_ACCESS_KEY_ID=<key>
OSS_ACCESS_KEY_SECRET=<secret>
OSS_BUCKET=<bucket>
OSS_ENDPOINT=https://oss-<region>.aliyuncs.com
```

### Demo Data Refresh

To anonymize existing client/order records and generate synthetic demo records:

```bash
npm run demo:data
```

Useful options:

```bash
# Preview only (no DB changes)
npm run demo:data -- --dry-run

# Only anonymize existing records
npm run demo:data -- --mode=anonymize

# Only generate new synthetic records
npm run demo:data -- --mode=seed --entities=30 --orders=120
```

The script targets the current tenant `SID` (from `.env`) and uses `DATABASE_URL`.

### Localization Automation

Use these scripts to keep locale keys and translations up to date.

1. Export locale keys from source (`__html`, `__attr`) into `server/assets/texts.json`:

```bash
npm run locales:export
```

2. Dry-run compare source keys with DB locale content (no writes):

```bash
npm run locales:sync:lv
```

Optional report file:

```bash
npm run locales:sync -- --locale=lv --report=server/assets/locales-missing-lv.json
```

3. Auto-translate only missing/empty keys and save to DB (existing non-empty translations are never overwritten):

```bash
npm run locales:translate:lv
```

Optional flags:

```bash
# target locale and extension
npm run locales:translate -- --locale=lv --ext=dashboard

# adjust batch size sent to translation API
npm run locales:translate -- --locale=lv --chunk=80
```

Requirements:

- `ANTHROPIC_API_KEY` in `.env`
- reachable PostgreSQL from the environment where the script runs

### Client Provisioning Defaults

Use a per-client JSON file to apply regional defaults into the `settings` row after provisioning.

Example config:

```json
{
  "sid": 1002170,
  "settings": {
    "default_timezone": "Asia/Dubai",
    "system_language": "en",
    "system_of_units": "metric",
    "currency": "AED",
    "currency_symb": "AED",
    "currency_symb_loc": "left_space",
    "tax_region": "AE",
    "vat_number": "AE123456789000003",
    "tax_percent_auto": true,
    "tax_percent": 5,
    "tax_display": "VAT"
  }
}
```

Run:

```bash
# dry run
npm run setup:client -- --config=etc/clients/acme.example.json --dry-run

# apply changes
npm run setup:client -- --config=etc/clients/acme.example.json
```

Optional SID override:

```bash
npm run setup:client -- --config=etc/clients/acme.example.json --sid=1000001
```

Only known regional keys are updated; unknown keys in JSON are ignored.

### OTP Relay Extension

The `kenzap-otp-relay` extension listens to `otp.requested` events and forwards OTP to:

`https://api.kenzap.cloud/v1/tenants/:tenantId/otp/:otp`

Optional environment variables:

```bash
KENZAP_OTP_RELAY_ENABLED=true
KENZAP_TENANT_ID=1000000
KENZAP_API_BASE_URL=https://api.kenzap.cloud
KENZAP_API_KEY=
```

By default, `TENANT_ID` falls back to `SID` if not set.

### PostgreSQL (Alternative setups)
For testing with remote PostgreSQL instances, you can use port forwarding when the database is deployed in Kubernetes:

```bash
kubectl get svc -n db-eu --kubeconfig=kubeconfig-GJDmHH.yaml
kubectl --kubeconfig=kubeconfig-GJDmHH.yaml \                                      
  -n db-eu port-forward pod/pg-forward 5433:5432
```
