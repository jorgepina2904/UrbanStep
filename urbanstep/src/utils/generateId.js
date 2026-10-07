/**
 * Generates a unique ID with an optional prefix.
 * @param {string} prefix - Prefix for the ID (e.g., 'PRD', 'USR', 'SAL')
 * @returns {string} A unique ID string
 */
export function generateId(prefix = 'ID') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

export default generateId;