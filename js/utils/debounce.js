/**
 * FILE: js/utils/debounce.js
 * Debounce Utility Function
 * Prevents a function from being called too frequently
 * NCS-API Website
 */

/**
 * Debounce a function by a delay.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The delay in milliseconds.
 * @param {boolean} immediate - Run on the leading edge instead of the trailing.
 * @returns {Function} - A debounced version of the original function.
 */
export function debounce(func, wait = 300, immediate = false) {
    let timeout;

    return function (...args) {
        const context = this;

        const later = function () {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };

        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);

        if (callNow) func.apply(context, args);
    };
}
