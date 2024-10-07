/**
 * Boolean field type is used for 1-bit `true` or `false` values.
 * @namespace field.bool
 */
const { appendBits, extractBits } = require('../../../bitman');
// const Types = require('../types');

// /** @type {Types.Field} */

/**
 * Decode a boolean field
 * @memberof field.bool
 * @private
 * @param {Field} field The field definition
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The start bit of the field in the buffer
 * @returns The decoded value and bit offset for the next read operation
 */
function decode(field, buffer, offset) {
  const value = extractBits(buffer, offset, 1) ? true : false;
  return { value: value, offset: offset + 1 };
}

/**
 * Encode a boolean field
 * @memberof field.bool
 * @private
 * @param {Field} field The field definition
 * @param {boolean} value The value to encode
 * @param {Buffer} buffer The buffer to append to
 * @param {number} offset The bit offset within the buffer to append at
 * @returns The encoded buffer and the offset for the next field within it
 */
function encode(field, value, buffer, offset) {
  if (typeof value != 'boolean') throw new Error('Invalid boolean value');
  return appendBits([value ? 1 : 0], buffer, offset);
}

module.exports = { decode, encode };