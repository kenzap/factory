# Reliability

## Core Principles

- PostgreSQL is the source of truth for orders, worklogs, inventory, documents, and other persisted ERP state.
- Node.js app containers should stay stateless apart from short-lived in-memory request/session helpers and currently connected SSE clients.
- Redis is the shared coordination layer for cacheable or ephemeral cross-container state, especially realtime fanout.

## Database Pooling

- The shared PostgreSQL pool enables TCP keepalive by default so long-idle sockets are less likely to be silently dropped by intermediate network devices before the app notices.
- Idle-client pool errors are logged with tenant id, environment, node identity, keepalive settings, timeout settings, and current pool metrics to make it easier to distinguish idle socket resets from broader database incidents.

## Realtime Delivery

- Live UI updates and extension event propagation are coordinated through Redis pub/sub instead of process-local memory alone.
- Each container subscribes to tenant-scoped realtime channels and rebroadcasts updates to its own local SSE connections and event listeners.
- This allows journals, order views, cutting-list, and extension-driven workflows to remain consistent when the app is scaled horizontally.

## Degraded Mode

- If Redis is unavailable, the server continues serving requests and falls back to process-local realtime delivery.
- In degraded mode, writes still persist correctly because PostgreSQL remains authoritative.
- The main limitation in degraded mode is that live updates emitted by one container will not reach SSE clients or extension listeners attached to another container until Redis connectivity is restored.
- The realtime bridge retries Redis connection attempts in the background, so multi-container fanout recovers automatically after Redis comes back.

## Runtime Error Capture

- Production server startup installs a global runtime error bridge so `console.error(...)`, uncaught exceptions, and unhandled promise rejections flow through the shared logger pipeline instead of only ephemeral container stdout.
- Logged runtime errors still print to the original process stderr/stdout stream, but they also use the existing logger email notification path when configured.
- Error report emails include runtime environment (`development` / `production`) and node identity (`HOSTNAME` or process id) so container-specific faults can be traced more quickly.
- Fatal uncaught exceptions wait briefly for the logger pipeline to flush before the process exits, which improves the chance of preserving crash context before Kubernetes restarts the container.
- Error-reporting internals use raw console output to avoid recursive "error while reporting an error" loops when SMTP or settings loading fails.
