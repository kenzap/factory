import { __html } from "../../helpers/global.js";

export const getRights = () => {

    return {
        // Orders
        order_management: { text: __html('Order Management Journal'), category: 'orders', class: 'text-dark bg-light', note: __html('Allows creating, removing, and updating orders.') },
        order_removal: { text: __html('Order Removal'), category: 'orders', class: 'text-dark bg-light', note: __html('Allows issuing orders in the manufacturing log.') },

        // Factory
        manufacturing_journal: { text: __html('Manufacturing Journal'), category: 'factory', class: 'text-dark bg-light', note: __html('Allows managing the manufacturing log and production status.') },
        cutting_journal: { text: __html('Cutting Journal'), category: 'factory', class: 'text-dark bg-light', note: __html('Allows managing the metal cutting log and processes.') },
        work_log_journal: { text: __html('Work Log Journal'), category: 'factory', class: 'text-dark bg-light', note: __html('Allows viewing and managing employee work logs.') },

        // Finance
        payments_journal: { text: __html('Payments Journal'), category: 'finance', class: 'text-dark bg-light', note: __html('Allows processing and managing payments and invoices.') },
        financial_reports: { text: __html('Financial Reports'), category: 'finance', class: 'text-dark bg-light', note: __html('Allows viewing financial reports and summaries.') },

        // Clients
        clients_journal: { text: __html('Clients Journal'), category: 'clients', class: 'text-dark bg-light', note: __html('Allows viewing and managing client records.') },
        client_management: { text: __html('Client Management'), category: 'clients', class: 'text-dark bg-light', note: __html('Allows managing corporate and private entities, individual records.') },

        // Warehouse
        warehouse_management: { text: __html('Warehouse Management'), category: 'warehouse', class: 'text-dark bg-light', note: __html('Allows managing warehouse stock and inventory.') },
        products_management: { text: __html('Publish or Remove Products'), category: 'warehouse', class: 'text-dark bg-light', note: __html('Allows creating, updating, and removing products.') },
        metal_stock_management: { text: __html('Metal Stock Management'), category: 'warehouse', class: 'text-dark bg-light', note: __html('Allows managing metal stock and inventory.') },
        inventory_report: { text: __html('Inventory Report'), category: 'warehouse', class: 'text-dark bg-light', note: __html('Allows viewing and generating inventory reports.') },

        // Settings
        settings_management: { text: __html('Settings Management'), category: 'settings', class: 'text-dark bg-light', note: __html('Allows updating system settings and configurations.') },

        // Analytics
        analytics_access: { text: __html('Analytics Access'), category: 'analytics', class: 'text-dark bg-light', note: __html('Allows accessing system analytics and reports.') },
        employee_performance_report: { text: __html('Employee Performance Report'), category: 'analytics', class: 'text-dark bg-light', note: __html('Allows accessing system analytics and reports.') },
        product_sales_report: { text: __html('Product Sales Report'), category: 'analytics', class: 'text-dark bg-light', note: __html('Allows accessing sales and client reports.') },

        // Portal
        portal_management: { text: __html('Portal Management'), category: 'portal', class: 'text-dark bg-light', note: __html('Allows access to the public portal and blog.') },

        // Localization
        localization_management: { text: __html('Localization Management'), category: 'localization', class: 'text-dark bg-light', note: __html('Allows adding and updating system languages.') },

        // Files
        file_management: { text: __html('File Management'), category: 'files', class: 'text-dark bg-light', note: __html('Allows uploading and managing system files.') },

        // Access
        access_management: { text: __html('Access Management'), category: 'access', class: 'text-dark bg-light', note: __html('Allows managing access permissions and roles.') },
        api_keys_management: { text: __html('API Keys Management'), category: 'access', class: 'text-light bg-danger', note: __html('Allows creating and removing API keys.') },

        // Users
        user_management: { text: __html('User Management'), category: 'users', class: 'text-light bg-danger', note: __html('Allows adding, updating, and removing users.') },
        user_rights_management: { text: __html('User Rights Management'), category: 'users', class: 'text-light bg-danger', note: __html('Allows adding new users to the portal.') }
    };
}