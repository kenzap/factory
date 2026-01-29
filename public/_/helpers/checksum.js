/**
 * Generates a checksum for an array by converting it to a JSON string and applying a hash function.
 * The checksum is computed using a bit-shifting hash algorithm and returned as a hexadecimal string.
 * 
 * @param {Array} arr - The array to generate a checksum for
 * @returns {string} The hexadecimal checksum string of the array
 * 
 * @example
 * const myArray = [1, 2, 3, 'test'];
 * const checksum = getArrayChecksum(myArray);
 * console.log(checksum); // Returns hexadecimal hash string
 */
export const getArrayChecksum = (arr) => {

    // create checksum of locale data
    const localeString = JSON.stringify(arr);
    const checksum = Array.from(localeString)
        .reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff, 0)
        .toString(16);

    return checksum;
}