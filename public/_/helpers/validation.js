/**
* Email format validation script
* 
* @param string email
* @return string
*/
export const isEmail = (email) => {

    if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,14})+$/.test(email)) {

        return true;
    } else {

        return false;
    }
}

/**
 * Validates a phone number using a simple regex pattern.
 * Accepts phone numbers with optional country code prefix (+), digits, spaces, hyphens, and parentheses.
 * 
 * @param {string} phone - The phone number string to validate
 * @returns {boolean} True if the phone number matches the validation pattern, false otherwise
 * 
 * @example
 * validatePhone("+1 (555) 123-4567"); // returns true
 * validatePhone("555-123-4567"); // returns true
 * validatePhone("invalid phone"); // returns false
 */
export const isPhone = (phone) => {
    // simple phone validation
    const phoneRegex = /^\+?[0-9\s\-\(\)]+$/;
    return phoneRegex.test(phone);
}


/**
 * Restricts input to numeric values only, with optional decimal and maximum value checks.
 *
 * @param {KeyboardEvent} e - The keyboard event triggered by user input.
 * @param {number} max - The maximum allowed numeric value.
 * @returns {boolean} Returns false if the input is not allowed, true otherwise.
 */
export const numsOnly = (e, max) => {

    // Only ASCII charactar in that range allowed 
    var ASCIICode = (e.which) ? e.which : e.keyCode
    if (ASCIICode > 31 && ASCIICode != 46 && (ASCIICode < 48 || ASCIICode > 57))
        return false;

    if (parseFloat(e.target.value) > max)
        return false;

    let dec = e.target.value.split('.');
    if (dec.length > 1)
        if (dec[1].length > 1)
            return false;

    return true;
}

/**
 * Checks if the current device is a mobile device (iPhone, iPod, iPad, or Android).
 *
 * @returns {boolean} Returns true if the user agent matches a mobile device, otherwise false.
 */
export const isMobile = () => {

    const nav = navigator.userAgent.toLowerCase();
    return (
        nav.match(/iphone/i) || nav.match(/ipod/i) || nav.match(/ipad/i) || nav.match(/android/i)
    );
}