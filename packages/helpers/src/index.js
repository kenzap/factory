/**
* Render price
* @public
*/
export const priceFormat = (settings, price, decimals = 2) => {

    price = parseFloat(price);
    if (Number.isNaN(price)) price = 0;
    const maxDecimals = Math.max(2, parseInt(decimals, 10) || 2);

    // Round to specified decimal places using banker's rounding (round half to even)
    const factor = Math.pow(10, maxDecimals);
    price = Math.round((parseFloat(price) + Number.EPSILON) * factor) / factor;

    // Format with max decimals, then trim redundant trailing zeros while keeping at least 2 decimals
    const minDecimals = 2;
    let formatted = price.toFixed(maxDecimals);
    if (maxDecimals > minDecimals) {
        const [intPart, decPart = ''] = formatted.split('.');
        const trimmed = decPart.replace(/0+$/, '');
        const finalDecimals = trimmed.length < minDecimals
            ? decPart.slice(0, minDecimals)
            : trimmed;
        formatted = `${intPart}.${finalDecimals}`;
    }
    price = formatted;

    // Add comma separators for large numbers
    const parts = price.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    price = parts.join('.');

    switch (settings.currency_symb_loc) {
        case 'left': price = settings.currency_symb + price; break;
        case 'right': price = price + settings.currency_symb; break;
        case 'left_space': price = settings.currency_symb + ' ' + price; break;
        case 'right_space': price = price + ' ' + settings.currency_symb; break;
    }

    return price;
}
