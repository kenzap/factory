# Reliability

## Core Principles

- PostgreSQL is the source of truth for orders, worklogs, inventory, documents, and other persisted ERP state.
- Node.js app containers should stay stateless apart from short-lived in-memory request/session helpers and currently connected SSE clients.
- Redis is the shared coordination layer for cacheable or ephemeral cross-container state, especially realtime fanout.

## Realtime Delivery

- Live UI updates and extension event propagation are coordinated through Redis pub/sub instead of process-local memory alone.
- Each container subscribes to tenant-scoped realtime channels and rebroadcasts updates to its own local SSE connections and event listeners.
- This allows journals, order views, cutting-list, and extension-driven workflows to remain consistent when the app is scaled horizontally.

## Degraded Mode

- If Redis is unavailable, the server continues serving requests and falls back to process-local realtime delivery.
- In degraded mode, writes still persist correctly because PostgreSQL remains authoritative.
- The main limitation in degraded mode is that live updates emitted by one container will not reach SSE clients or extension listeners attached to another container until Redis connectivity is restored.
- The realtime bridge retries Redis connection attempts in the background, so multi-container fanout recovers automatically after Redis comes back.
