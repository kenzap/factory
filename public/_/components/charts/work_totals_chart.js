import { __html } from "../../../_/helpers/global.js";
import { state } from '../../modules/charts/state.js';

export function drawWorkTotalsChart(sel, settings, data) {

    // sample structure of settings.work_categories
    // "work_categories": [
    //     {
    //         "id": "cutting",
    //         "name": "Cutting"
    //     },
    //     {
    //         "id": "bending",
    //         "name": "Bending"
    //     },

    const workTypeData = {};
    data.forEach(entry => {
        workTypeData[entry.type] = (workTypeData[entry.type] || 0) + entry.total_qty;
    });

    // Map work category IDs to their display names
    const getWorkCategoryName = (id) => {
        const category = settings.work_categories.find(cat => cat.id === id);
        return category ? __html(category.name) : id;
    };

    const labels = Object.keys(workTypeData).map(getWorkCategoryName);

    const ctx = document.getElementById(sel).getContext('2d');

    if (state.charts.workTotals) {
        state.charts.workTotals.destroy();
    }

    state.charts.workTotals = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: __html('Total'),
                data: Object.values(workTypeData),
                backgroundColor: 'rgba(13, 110, 248, 0.8)',
                borderColor: 'rgba(13, 110, 248, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}