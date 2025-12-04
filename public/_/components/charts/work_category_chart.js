import { __html } from "../../../_/helpers/global.js";
import { state } from '../../modules/charts/state.js';

export function drawWorkCategoryChart(sel, settings, data) {

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
        workTypeData[entry.type] = (workTypeData[entry.type] || 0) + entry.count;
    });

    // Map work category IDs to their display names
    const getWorkCategoryName = (id) => {
        const category = settings.work_categories.find(cat => cat.id === id);
        return category ? __html(category.name) : id;
    };

    const labels = Object.keys(workTypeData).map(getWorkCategoryName);

    const ctx = document.getElementById(sel).getContext('2d');

    if (state.charts.workType) {
        state.charts.workType.destroy();
    }

    state.charts.workType = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: Object.values(workTypeData),
                backgroundColor: [
                    '#667eea', '#764ba2', '#f093fb', '#4facfe',
                    '#43e97b', '#fa709a', '#feca57', '#ff6b6b'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}