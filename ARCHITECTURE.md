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
Pay attention to the **Architecture Invariant** sections.
They often talk about things which are deliberately absent in the source code.

### `rollup.config.mjs`

This is ERP's "build system".
We use rollup to compile ERP's code, but there are also other tasks, like compile for production, deploy to production.
Located at [rollup.config.mjs](../rollup.config.mjs)

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

Located at [public](../public)

### `/server`

A node.js written backend running on express application. It's main contents are
    - server/server.js - entry point of express application
    - server/_ - underscores folder, where all supporting utils, helpers, modules, depenedencies, libraries are placed.
    - server/api - folder where core express API routes are defined, 
    - server/document - folder used by server generated PDF reports or documents, ex. invoice, quotation. More [here](./design-docs/document-production-slip.md).
    - server/extensions - folder where plugins can be dropped to extend core ERP features 

Located at [server](../server)

## Helper Placement Guideline

- Reusable backend utility logic must be implemented once under `server/_/helpers/`.
- API routes and document modules should import shared helpers instead of duplicating local utility functions.
- Example: timezone validation and normalization lives in `server/_/helpers/timezone.js` and is reused by settings save flow and document rendering.

## Observability

Live system logs and crytical errors can be observed from `docker compose up` terminal output

## Validation Notes

- `./build.sh` is required before production deployment.
- During feature validation, prefer end-to-end checks:
  - API behavior verification for changed endpoints
  - `docker compose` log inspection after exercising changed flows
  - browser console checks for UI/runtime issues
