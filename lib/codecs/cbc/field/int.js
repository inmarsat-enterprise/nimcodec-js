/**
 * Signed integer field of user-definable size (payload bits).
 * 
 * For example latitude and longitude could be represented by 24- and 25-bit
 * integers as 0.001 minutes providing a resolution of approximately 1 meter.
 * @namespace field.int
 */
const { appendBits, int2bits, extractBits, isInt } = require('../../../bitman');
const { calcDecode, calcEncode } = require('./calc');
const Types = require('../types');

/** @type {Types.Field} */

/**
 * Decode a signed integer field
 * @memberof field.int
 * @private
 * @param {Field} field The field definition
 * @param {number} field.size The number of bits used for transport
 * @param {string} [field.calc] Optional calculation expression
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The start bit of the field in the buffer
 * @returns The value and bit offset for the next read operation
 */
function decode(field, buffer, offset) {
  let value = extractBits(buffer, offset, field.size);
  if ((value & (1 << (field.size - 1))) != 0) {
    value = value - (1 << field.size);
  }
  if (Object.hasOwn(field, 'decalc'))
    value = calcDecode(field.decalc, value);
  return { value: value, offset: offset + field.size };
}

/**
 * Endoce a signed integer field
 * @memberof field.int
 * @private
 * @param {Field} field The field definition
 * @param {number} field.size The number of bits used for transport
 * @param {string} [field.calc] Optional calculation expression
 * @param {number} value The value to encode
 * @param {Buffer} buffer The buffer to append to
 * @param {number} offset The bit offset within the buffer to append at
 * @returns The encoded buffer and the offset for the next field within it
 */
function encode(field, value, buffer, offset) {
  if (Object.hasOwn(field, 'encalc'))
    value = calcEncode(field.encalc, value);
  if (!isInt(value) ||
      value < -(2**field.size / 2) || value > (2**field.size / 2 - 1)) {
    throw new Error('Invalid signed integer value for size');
  }
  return appendBits(int2bits(value, field.size), buffer, offset);
}

module.exports = { decode, encode };