import { __html } from "../../../_/helpers/global.js";
import { state } from '../../modules/charts/state.js';

export function drawWorkTotalsByDayChart(sel, settings, data) {

    // sample structure of settings.work_categories
    // "work_categories_by_day_stats": [
    // {
    //     "date": "2025-12-04T00:00:00.000Z",
    //     "count": "3",
    //     "total_qty": "3824"
    // },

    const workTypeByDayData = {};
    data.forEach(entry => {
        const date = new Date(entry.date).toISOString().split('T')[0]; // Format as YYYY-MM-DD
        workTypeByDayData[date] = (workTypeByDayData[date] || 0) + parseInt(entry.total_qty);
    });

    const labels = Object.keys(workTypeByDayData).sort();
    const values = labels.map(date => workTypeByDayData[date]); // Fixed: use labels instead of workTypeByDayData

    const ctx = document.getElementById(sel).getContext('2d');

    if (state.charts.workTotalsByDay) {
        state.charts.workTotalsByDay.destroy();
    }

    state.charts.workTotalsByDay = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: __html('Daily Total'),
                data: values,
                borderColor: '#0d6ef8',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                fill: true,
                tension: 0,
                pointBackgroundColor: '#0d6ef8',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
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
