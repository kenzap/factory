# Kenzap Factory

![Factory](https://raw.githubusercontent.com/kenzap/factory/main/preview.png)

**About**: An open-source, compilation-free ES6 and Node.js ERP system built for metal fabrication.

Production, costing, and planning designed for job-based manufacturing.

**Stack:**
- PostgreSQL
- Redis
- Node.js
- ES6 JavaScript

**Demo:** https://kenzap.com

## What is "Kenzap Factory"?

An ERP system designed specifically for metal fabricators. It supports real production workflows, not accounting-driven workarounds. The focus is on job shops, make-to-order production, and compliance.

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
- View total number of products sold -

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
docker compose up
```

This will create 4 containers: Redis, Node.js, PostgreSQL, and Adminer (for managing PostgreSQL data). Demo data will be installed automatically from the `postgres.sql` file located in the root of this repository.

You can access PostgreSQL with the default password `password123`:

```bash
http://localhost:8080/?pgsql=local_postgres&username=postgres&db=cloud&ns=public
```

To open ERP dashboard

```bash
http://localhost:3000/home/
```

### PostgreSQL (Alternative setups)
For testing with remote PostgreSQL instances, you can use port forwarding when the database is deployed in Kubernetes:

```bash
kubectl get svc -n db-eu --kubeconfig=kubeconfig-GJDmHH.yaml
kubectl --kubeconfig=kubeconfig-GJDmHH.yaml \                                      
  -n db-eu port-forward pod/pg-forward 5433:5432
```