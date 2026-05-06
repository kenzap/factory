# Architecture

This document describes the high-level architecture of Kenzap ERP system.
If you want to familiarize yourself with the code base, you are just in the right place!

## Bird's Eye View

This is a manufacturing-focused ERP system built for a factory business, like sheet metal and construction related workshops, industrial warehouses.

At the highest level, it's an end-to-end operations platform that connects every layer of the business, from the factory floor to the office quotations and factory board. It covers entire lifecycle of order management and product manufacturing and giving gives ownership proactive commercial awareness.

The core loop is: 
    - a manager creates a quotation/order, estimates metal consumption, prints waybills, invoices and production slips
    - factory employees execute and log work
    - factory floor reports material consumed 
    - warehouse tracks materials and invetory consumed
    - finance maps payments and exports to external accounting software
    - ownership gets consolidated visibility

## Code Map

This section talks briefly about various important directories and data structures.

### `rollup.config.mjs`

This is ERP's "build system".
We use rollup to compile ERP's code, but there are also other tasks, like compile for production, deploy to production.
Located at [rollup.config.mjs](./rollup.config.mjs)

### `public`

All frontend files are located in this folder. They support rollup compilation but can can be loaded as ES6 modules directly by the browser. A folder inside public folder is usually reposnsible for a log, journal or some part of an ERP's dashboard. Example:
    - public/_ - where all reusable frontend modules, libs and components are located
    - public/assets - static assets folder, dedicated to css, js, fonts, images
    - public/home - entry page of an ERP system
    - public/login - OTP authentication page
    - public/orders - journal that lists all orders in the system
    - public/order - single order/quotation creation and editing page
    - public/stock - journal for inventory overview and manual stock updates
    - public/settings - central place for all ERP settings
    - public/product-list - list of products registered in the system
    - public/product-edit - product editing page
    - public/metallog - metal inventory and supply journal
    - public/localization - ERP text localization module
    - public/manufacturing - live journal of all manufacturing processes
    - public/tasks - operations task and reminder workspace with journal and calendar views

Located at [public](./public)

### `/server`

A node.js written backend running on express application. It's main contents are
    - server/server.js - entry point of express application
    - server/_ - underscores folder, where all supporting utils, helpers, modules, depenedencies, libraries are placed.
    - server/api - folder where core express API routes are defined, 
    - server/document - folder used by server generated PDF reports or documents, ex. invoice, quotation. More [here](./design-docs/document-production-slip.md).
    - server/extensions - folder where plugins can be dropped to extend core ERP features 

Located at [server](./server)

## Helper Placement Guideline

- Reusable backend utility logic must be implemented once under `server/_/helpers/`.
- API routes and document modules should import shared helpers instead of duplicating local utility functions.
- Example: timezone validation and normalization lives in `server/_/helpers/timezone.js` and is reused by settings save flow and document rendering.
- Shared cross-runtime business logic (used by both browser and Node) should live in `packages/`.
- Tax regime definitions and tax calculation logic are centralized in `packages/tax-core/src/` and consumed by both `public/` and `server/`.
- Backend modules should import shared tax logic via package specifiers such as `@factory/tax-core/calculator` and `@factory/tax-core/index`.

## Observability

Live system logs and crytical errors can be observed from `docker compose up` terminal output

## Database Access

- Backend request handlers use a shared per-process PostgreSQL `pg.Pool` through `getDbConnection()` instead of creating standalone clients for every request.
- The compatibility wrapper preserves the existing `connect() / query() / end()` call pattern while pinning a pooled client only when a code path explicitly calls `connect()` for multi-query or transactional work.
- Extension helper queries borrow pooled connections per query rather than holding a dedicated PostgreSQL session for the lifetime of the extension context.
- The shared pool emits an operational warning email once usage reaches the configured threshold (70% by default) on a pod. Alerts are cooldown-limited so one saturation burst does not spam the inbox. Recipients default to `POSTGRES_POOL_ALERT_EMAIL_TO`, then cached logger email settings, then `ADMIN_EMAIL`.
- Operations tasks are stored in the shared `data` table under `ref = 'task'`, which keeps the first release compatible with existing tenant scoping, backup, and audit conventions.

## Realtime Coordination

- Browser live updates use Server-Sent Events (SSE), but SSE client connections remain local to the Node.js process that accepted them.
- Cross-container propagation is coordinated through Redis pub/sub channels under the tenant-scoped prefix `factory:<sid>:realtime`.
- Two shared channels are used today:
  - `...:sse` for order, stock, manufacturing, cutting-list, and related frontend live-update payloads
  - `...:events` for extension/core event-bus messages such as OTP notifications and order item change events
- Task journal live updates use the same SSE bridge and broadcast `task-update` / `task-delete` payloads after task writes, so all pods can refresh connected `/tasks/` views consistently.
- Each container keeps its own in-memory SSE client list and extension listeners, subscribes to the shared Redis channels, and rebroadcasts inbound messages locally.
- PostgreSQL remains the source of truth for persisted business state; Redis only transports ephemeral realtime notifications between containers.
- Order-item mutation APIs must resolve items by stable `item.id` rather than client-visible array index, because journals can filter or reorder rows before dispatching actions.
- Extension side effects that must happen only once per tenant request or schedule tick (for example OTP delivery and scheduled WhatsApp notifications) use Redis-backed cluster locks, because the same extension listeners and cron jobs are loaded in every container.
- Extension cron jobs can opt into singleton execution through the shared cron manager, which acquires a Redis lock per job key so only one pod runs that scheduled tick in production.
- If Redis is temporarily unavailable, the server falls back to process-local live updates and retries the bridge connection in the background. Single-container behavior continues, but multi-container realtime consistency is degraded until Redis reconnects.
- Browser journals intentionally keep their authenticated SSE handshake on `POST`; that has proven more reliable through the current production proxy path than long-lived `GET` streams.
- Realtime diagnostics can be enabled with `REALTIME_DEBUG=1` (or `REDIS_REALTIME_DEBUG=1`), which prints Redis bridge subscribe/publish/receive traces to server logs.
- Authenticated debug endpoints under `/api/sse-debug/*` expose a simple SSE ticker, current local client counts, and a manual debug broadcast trigger for isolating proxy vs application fanout issues.

## Validation Notes

- `./build.sh` is required before production deployment.
- During feature validation, prefer end-to-end checks:
  - API behavior verification for changed endpoints
  - `docker compose` log inspection after exercising changed flows
  - browser console checks for UI/runtime issues
