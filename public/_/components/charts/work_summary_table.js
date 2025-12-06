import { __html, getUserName } from "../../../_/helpers/global.js";

export function drawWorkSummaryTable(sel, settings, users, data) {

    // sample structure of settings.work_categories
    //  "employee_performance": [
    //         {
    //             "type": "bending",
    //             "user_id": "001ff236dfc8c086c7083e98b9e947bfaf8caf51",
    //             "count": "2",
    //             "total_qty": "42"
    //         },
    //         {
    //              "type": "cutting",
    //              "user_id": "001ff236dfc8c086c7083e98b9e947bfaf8caf51",
    //              "count": "9",
    //               "total_qty": "127749"
    //          },

    // Map work category IDs to their display names
    const getWorkCategoryName = (id) => {
        const category = settings.work_categories.find(cat => cat.id === id);
        return category ? __html(category.name) : id;
    };

    // Generate table headers
    const types = [...new Set(data.map(item => item.type))];
    const employees = [...new Set(data.map(item => item.user_id))];

    let tableHTML = `
        <table class="work-summary-table">
            <thead>
                <tr>
                    <th>${__html('Employee')}</th>
                    ${types.map(type => `<th>${getWorkCategoryName(type)}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    // Generate table rows for each user
    employees.forEach(userId => {

        tableHTML += `<tr><td>${getUserName(users, userId)}</td>`;

        types.forEach(type => {
            const userWork = data.find(
                item => item.user_id === userId && item.type === type
            );

            const totalQty = userWork ? userWork.total_qty : '0';

            tableHTML += `<td>${totalQty}</td>`;
        });

        tableHTML += '</tr>';
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    // Insert the table into the selected element
    document.getElementById(sel).innerHTML = tableHTML;
}