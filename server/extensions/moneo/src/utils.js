/**
 * Rounds a number to two decimal places and returns it as a string with exactly two decimal places.
 * 
 * @param {number|string} num - The number to round. Can be a number or a string representation of a number.
 * @returns {string} The rounded number as a string with exactly two decimal places (e.g., "3.14", "5.00").
 * 
 * @example
 * roundToTwoDecimals(3.14159) // returns "3.14"
 * roundToTwoDecimals("2.567") // returns "2.57"
 * roundToTwoDecimals(5) // returns "5.00"
 */
export const roundToTwoDecimals = (num) => {

    return (Math.round((parseFloat(num) + Number.EPSILON) * 100) / 100).toFixed(2);
}

/**
 * Converts a date input to a formatted date string in YYYY-MM-DD format.
 * 
 * @param {string|number|Date} date - The date to convert. Can be a Date object, timestamp, or date string.
 * @returns {string} A formatted date string in YYYY-MM-DD format, or '0000-00-00' if the input is invalid.
 * 
 * @example
 * convertToDateString('2023-12-25') // Returns '2023-12-25'
 * convertToDateString(new Date(2023, 11, 25)) // Returns '2023-12-25'
 * convertToDateString('invalid') // Returns '0000-00-00'
 */
export const convertToDateString = (date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
        return '0000-00-00';
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}