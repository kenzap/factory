# ![Factory](https://skarda.design/assets/img/logo2.png)

**Kenzap Factory**: A compilation free ES6 and node.JS ERP system.

**Stack:**
- PostgreSQL
- Redis
- Node.JS
- ES6 JS

**Demo:** https://factory.kenzap.cloud

## What is "Kenzap Factory"?

An ERP for sheet metal fabrication. Infcludes the following modules:
- Manufacturing journal
- Clients journal
- Access and Users
- Metal cutting and nesting integration
- Warehouse and product inventory
- Financial reports
- Analytics module

## Opening Posgres from cluster
kubectl get svc -n db-eu --kubeconfig=kubeconfig-GJDmHH.yaml
kubectl -n db-eu port-forward svc/app 5432:5432 --kubeconfig=kubeconfig-GJDmHH.yaml

