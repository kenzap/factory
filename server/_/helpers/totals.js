

/**
 * Converts a monetary amount to its written representation in Latvian language
 * 
 * @param {number} amount - The monetary amount to convert (e.g., 123.45)
 * @param {Object} settings - Configuration object containing currency settings
 * @param {string} settings.currency - The currency code (e.g., "EUR", "USD")
 * 
 * @returns {string} The amount expressed in Latvian words with proper currency notation
 *                   (e.g., "Simts divdesmit trīs Eiro, 45 eirocenti")
 * 
 * @example
 * // Convert 123.45 EUR to Latvian words
 * amountToWords(123.45, { currency: "EUR" })
 * // Returns: "Simts divdesmit trīs Eiro, 45 eirocenti"
 * 
 * @example
 * // Convert 0 EUR to Latvian words
 * amountToWords(0, { currency: "EUR" })
 * // Returns: "Nulle Eiro"
 * 
 */
export const amountToWords = (amount, settings) => {
    // Debug logging to track function inputs
    // console.log(`amountToWords: ${amount}, settings: ${settings}`);

    // Separate the amount into integer and fractional parts
    // Math.floor() removes decimal places to get whole euros
    const amount_int = Math.floor(amount);
    // Calculate cents by taking decimal part and multiplying by 100, then rounding
    const amount_cents = Math.round((amount - amount_int) * 100);

    // Latvian number word arrays for converting numbers to text
    const units = ["", "viens", "divi", "trīs", "četri", "pieci", "seši", "septiņi", "astoņi", "deviņi"];
    const teens = ["desmit", "vienpadsmit", "divpadsmit", "trīspadsmit", "četrpadsmit", "piecpadsmit", "sešpadsmit", "septiņpadsmit", "astoņpadsmit", "deviņpadsmit"];
    const tens = ["", "", "divdesmit", "trīsdesmit", "četrdesmit", "piecdesmit", "sešdesmit", "septiņdesmit", "astoņdesmit", "deviņdesmit"];
    const hundreds = ["", "simts", "divsimt", "trīssimt", "četrsimt", "piecsimt", "sešsimt", "septiņsimt", "astoņsimt", "deviņsimt"];

    /**
     * Converts a number (0-999999) to its Latvian word representation
     * @param {number} num - The number to convert
     * @returns {string} - The number in Latvian words
     */
    function numberToWords(num) {
        // Return empty string for zero (handled separately in main function)
        if (num === 0) return "";

        let words = '';

        // Handle thousands place (1000-999999)
        if (num >= 1000) {
            const thousandsPart = Math.floor(num / 1000);
            const thousandsWords = numberToWords(thousandsPart);
            words += thousandsWords + " tūkstoši ";
            num %= 1000; // Remove thousands from the number
        }

        // Handle hundreds place (100-900)
        if (num >= 100) {
            const hundredsPart = Math.floor(num / 100);
            words += hundreds[hundredsPart] + " ";
            num %= 100; // Remove hundreds from the number
        }

        // Handle tens place (20-90)
        if (num >= 20) {
            words += tens[Math.floor(num / 10)] + " ";
            num %= 10; // Remove tens from the number
        }
        // Handle special case for teens (10-19)
        else if (num >= 10) {
            words += teens[num - 10] + " ";
            return words.trim(); // Return early as teens don't need units
        }

        // Handle units place (1-9)
        if (num > 0) {
            words += units[num] + " ";
        }

        return words.trim(); // Remove trailing spaces
    }

    let result = '';

    // Convert the main amount (euros) to words
    const mainWords = numberToWords(amount_int);
    if (mainWords) {
        // Capitalize first letter of the amount in words
        result += mainWords.charAt(0).toUpperCase() + mainWords.slice(1) + " ";
    } else {
        // Handle zero amount case
        result += "Nulle ";
    }

    // Add appropriate currency name based on settings
    if (settings.currency === "EUR") {
        // In Latvian, "Eiro" is used for both singular and plural
        result += amount_int === 1 ? "Eiro" : "Eiro";
    } else {
        // Use the currency code directly for non-EUR currencies
        result += settings.currency;
    }

    // Add cents portion if there are any fractional cents
    if (amount_cents > 0) {
        result += ", " + amount_cents + " ";
        // Add appropriate cents denomination
        if (settings.currency === "EUR") {
            result += "eirocenti";
        } else {
            result += "centi";
        }
    }

    // Return the complete amount in words
    return result;
}
