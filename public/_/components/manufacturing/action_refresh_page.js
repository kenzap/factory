import { state } from "../../modules/manufacturing/state.js";
import { refreshOrders } from "./utils.js";

export const actionRefreshPage = () => {

    if (state.autoUpdateInterval) {
        clearInterval(state.autoUpdateInterval);
        state.autoUpdateInterval = null;
    }

    state.autoUpdateInterval = setInterval(() => {
        autoUpdate();
    }, 3 * 60 * 1000); // 3 minutes

    listeners();
}

const listeners = () => {

    // Track mouse movement
    document.addEventListener('mousemove', () => {
        state.mouseTime = Date.now() / 1000;
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {

        // F5 or Ctrl+R to refresh
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
            e.preventDefault();
            refreshOrders();
        }

        // Escape to clear search
        if (e.key === 'Escape') {
            document.getElementById('orderSearch').value = '';
            document.getElementById('companySearch').value = '';
            state.actionGetOrders();
        }
    });
}

const autoUpdate = async () => {
    try {
        // Simulate checking for updates
        const now = Date.now() / 1000;

        // Only update if user hasn't been active for 30 seconds
        if ((now - state.mouseTime) > 60) {
            await state.actionGetOrders();
        } else {
            // Show update indicator
            showUpdateIndicator();
        }
    } catch (error) {
        console.error('Auto update failed:', error);
    }
}

const showUpdateIndicator = () => {
    const refreshBtn = document.querySelector('.btn-outline-light');
    refreshBtn.style.color = '#e74c3c';
    setTimeout(() => {
        refreshBtn.style.color = '';
    }, 3000);
}