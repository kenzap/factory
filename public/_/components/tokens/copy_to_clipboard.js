import { __html, toast } from "../../helpers/global.js";

/**
 * Copy token to clipboard
 */
export const copyToClipboard = (token) => {

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(token).then(() => {
            toast(__html('Token copied to clipboard!'));
        }).catch(() => {
            fallbackCopy(token);
        });
    } else {
        fallbackCopy(token);
    }
}

/**
 * Fallback copy method for older browsers
 */
const fallbackCopy = (token) => {
    const textArea = document.createElement('textarea');
    textArea.value = token;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
        document.execCommand('copy');
        toast(__html('Token copied to clipboard!'));
    } catch (err) {
        toast(__html('Failed to copy. Please copy manually.'), 'error');
    }

    document.body.removeChild(textArea);
}