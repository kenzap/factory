# DB Schema

All ERP's data is stored in one single PostgreSQL table called data. Example structure: 

Column      Type                        Comment
_id         character(40)	            A unique id 40 char id number of the record
pid         character(40)	            pid, parent row id number, in case link between rows is neccessary (optional)
sid         integer	                    numberic parameter to isolate ERP tenants data when runs as SaaS
ref         character varying(100)	    groups records, ex. order, user, product, settings
js          jsonb	                    all data is stored in jsonb 
embedding	vector(3072) NULL           vector embedding (optional)

## Ref: order  

**Order (top level)** is the core entity. It carries identity fields (`id`, `_id`, `eid`), client info (`name`, `email`, `phone`, `address`, `entity`, `person`), operational metadata (`operator`, `draft`, `due_date`, `created`, `updated`), and a `price` object that summarizes the full order financials — subtotal, tax percent, tax total, and grand total.

**Items array** is where the complexity lives. Each item represents a manufactured product and contains:

- **Product identity** — `id`, `title`, `sdesc` (short description/variation), `group` (e.g. "bending"), `priority`
- **Pricing logic** — `calc_price` mode (`"formula"` or presumably fixed/variable), `formula` for the unit price calculation, `formula_price` for the per-m2 cost, `price`, `discount`, `adj` (adjustment), and `total`
- **Geometry formulas** — `formula_width`, `formula_length`, `formula_width_calc`, `formula_length_calc` define how dimensions are derived from inputs
- **Input fields** — the most interesting part: an array of interactive measurement inputs, each typed as `polyline`, `arc`, or `arrow-angle`. These map directly to a visual sketch (CAD-like), with SVG path `points`, min/max constraints, label positions, and default values. This is essentially a parametric configurator.
- **Input field values** — a flat snapshot of what the user actually entered (A, B, C, L, α, β, γ)
- **CAD files** — attached `.obj` and `.mtl` files for the 3D model of the element
- **Material/finish** — `coating`, `color` (RAL code like RR20), `tax_id`

**The design pattern** is a parametric manufacturing order — products aren't just SKUs, they're configurable shapes defined by formulas and geometry inputs. The price is computed dynamically from dimensions rather than being a fixed catalog price.

**Demo data**
See also the [jsonb](./order.json) data structure sample.

## Ref: entity

**Client / Company Record**

The top-level entity represents a **business client** (`entity: "company" or "individual"`).

**Legal & Tax Identity**
`reg_number`, `vat_number`, `vat_status`, `reg_address`, `legal_name` form the fiscal identity of the company. `vat_status: "0"` means not VAT registered or VAT exempt even if registered, which would affect how invoices and financial reports are generated for this client.

**Contact Model**
Contacts are a sub-array, each with their own `id`, name, email, phone, notes, and a `primary` flag. This supports companies with multiple contact persons while designating one as the default. The top-level `email` and `phone` on the root object appear to be legacy or fallback fields. The contacts array is the real source of truth. These contacts are passed to the order when it is created, manager decides which to select.

**Addresses & Drivers**
Both are arrays (currently empty), suggesting the client can have multiple delivery addresses and assigned logistics drivers. Relevant for dispatch workflows. Used during order or quotation creation.

**Discounts**
The most domain-specific part. Discounts are stored per product group rather than as a single global percentage. The groups map directly to your product catalog categories: `bending`, `roofing-panel`, `stock-product`, `snow-retention`, `complex-product`, `roofing-fasteners`, `rainwater-system-round`, `rainwater-system-square`. This means pricing can be negotiated per category independently for each client.

**Banking**
`bank_acc` and `bank_name` are flat fields. Used in waybills and invoice documents.

**Meta**
Standard `created` / `updated` Unix timestamps, mirrored in both `data` and a separate `meta` envelope.

**Demo data**
See also the 
    - [jsonb for company](./entity-company.json)
    - [jsonb for individual](./entity-individual.json)

## Ref: product  
See samples of data structure: 
    - [jsonb for Ridge element type 4](./product-type-1.json)

## Ref: settings  
See samples of data structure: 
    - [jsonb for Ridge element type 4](./settings.json)

There is only one instance of this record type in the database. This is **global settings / configuration record** for the ERP — essentially a single document that drives how the entire platform behaves. It breaks down into several distinct concern areas:

**Pricing Engine**
The `price` array is the master rate table. It has two types of entries: coating prices (per m²) organized by material family. Zinc, Polyester, Matt Polyester, Matt Pural — with specific RAL color variants under each; and named rate constants with short IDs like `BP` (Bending Price per unit), `AP` (Assembly Price per hour), `MS` (Margin per m²), `MARGIN`, `PHR` (Person Hour Rate), `PC` (Powder Coating), `MP1`/`MP2` (Metal Plates), `MS4` (Metal Strip). The `public` flag controls whether a price is visible on the client-facing portal.

**Product & Work Taxonomy**
`groups` defines the 8 order item categories (bending, roofing panel, rainwater systems, etc.) — the same ones used in client discount records. `work_categories` defines the 10 factory operations employees can log against (cutting, bending, marking, assembly, stamping, etc.). `stock_categories` is a separate taxonomy for warehouse inventory, with more granular rainwater system variants.

**3D Texture Library**
The `textures` array holds PBR rendering parameters for each coating/color combination — `metallic`, `roughness`, `energy`, `ratio`, `swap_colors`, `coating_side`. These drive the real-time 3D product configurator shown to managers and clients when customizing orders.

**Document Templates**
Four HTML templates stored as raw strings: `invoice_document_template`, `waybill_document_template`, `quotation_document_template`, and `production_slip_document_template`. All use `{{mustache}}` style variables for dynamic data injection. The production slip is notably larger-font and more workshop-friendly; the quotation hides the signature block by default.

**Integrations**
`dialog360` keys configure the WhatsApp messaging layer (360dialog provider) used for auth and notifications. `moneo` keys connect to an external accounting/payment system. `waybill_last_number` tracks the sequential document counter (`SKA-228684`).

**Notifications & Email**
Granular on/off flags and email lists for each order lifecycle event — new order, processed, completed, cancelled, refunded. Includes templated subject lines and bodies in Latvian, with `{{order_id}}`, `{{client_name}}`, `{{order_link}}` placeholders.

**Business Identity**
`brand_name`, `domain_name`, `vat_number`, `tax_region`, `currency`, `tax_percent` (21% — standard Latvian VAT), `system_of_units` (metric), and `last_order_id` (a monotonic counter currently at 43181).