/**
 * Calculation methods for efficient transportation as integer values.
 */
const mathjs = require('mathjs');
const { isInt } = require('../../../bitman');

/**
 * Calculate a decoded value from a tranported integer value
 * @param {string} decalc The decode calculation expression
 * @param {number} encoded The encoded (int) value
 * @returns The derived number after the math expression
 */
function calcDecode(decalc, encoded) {
  if (typeof decalc !== 'string' || !decalc.includes('v'))
    throw new Error('Invalid calc expression');
  if (!isInt(encoded))
    throw new Error('Invalid encoded must be integer');
  const expr = decalc.replaceAll('v', `${encoded}`);
  return mathjs.evaluate(expr);
}

/**
 * Calculate an encoded integer value for transport
 * @param {string} encalc The encode calculation expression
 * @param {number} decoded The pre-encoded value (e.g. float)
 * @returns The encoded integer value
 */
function calcEncode(encalc, decoded) {
  if (typeof encalc !== 'string' || !encalc.includes('v'))
    throw new Error('Invalid calc expression');
  if (typeof decoded !== 'number')
    throw new Error('Invalid encoded must be number');
  let expr = encalc.replaceAll('v', `${decoded}`);
  return Math.round(mathjs.evaluate(expr));
}

module.exports = { calcDecode, calcEncode };