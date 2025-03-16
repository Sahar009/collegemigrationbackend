/**
 * Generates a unique reference code with a prefix
 * @param {string} prefix - Prefix for the reference code (e.g., 'REF', 'TXN', 'PAY')
 * @returns {string} - Generated reference code
 */
export const generateReference = (prefix = 'REF') => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
};

/**
 * Validates a reference code format
 * @param {string} reference - Reference code to validate
 * @param {string} prefix - Expected prefix
 * @returns {boolean} - True if valid format
 */
export const validateReference = (reference, prefix = 'REF') => {
    const pattern = new RegExp(`^${prefix}-\\d+-[A-Z0-9]{6}$`);
    return pattern.test(reference);
}; 