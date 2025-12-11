import { __html } from "../../helpers/global.js";

export const getRights = () => {

    return {
        manage_api_keys: { text: __html('Manage API Keys'), class: 'text-light bg-dark', note: __html('Allows creating and removing API keys.') },
        manage_user_rights: { text: __html('Manage User Rights'), class: 'text-light bg-dark', note: __html('Allows adding new users to the portal.') },
        manage_orders: { text: __html('Create/Edit Orders'), class: 'text-dark bg-light', note: __html('Allows creating, removing, and updating orders.') },
        manage_finanse: { text: __html('Manage Banking Log'), class: 'text-dark bg-light', note: __html('Allows viewing the banking log and transactions.') },
        manage_products: { text: __html('Publish or Remove Products'), class: 'text-dark bg-light', note: __html('Allows creating, updating, and removing products.') },
        issue_orders: { text: __html('Issue Orders'), class: 'text-dark bg-light', note: __html('Allows issuing orders in the manufacturing log.') },
        manage_stock: { text: __html('Manage Stock'), class: 'text-dark bg-light', note: __html('Allows updating product supplies and writing off stock.') },
        access_analytics: { text: __html('Access Analytics'), class: 'text-dark bg-light', note: __html('Allows accessing sales and client reports.') }
    };
}