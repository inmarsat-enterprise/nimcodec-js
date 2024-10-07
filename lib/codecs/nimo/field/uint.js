/**
 * Unsigned integer of user-definable size (payload bits).
 * @namespace field.uint
 */
const { appendBits, int2bits, extractBits } = require('../../../bitman');
const Types = require('../types');

/** @type {Types.Field} */

/**
 * Decode an unsigned integer field
 * @memberof field.uint
 * @private
 * @param {Field} field The field definition
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The start bit of the field in the buffer
 * @returns The decoded value and the bit offset for the next read operation
 */
function decode(field, buffer, offset) {
  const value = extractBits(buffer, offset, field.size);
  return { value: value, offset: offset + field.size };
}

/**
 * Encode an unsigned integer field
 * @memberof field.uint
 * @private
 * @param {Field} field The field definition
 * @param {number} value The value to encode
 * @param {Buffer} buffer The buffer to append to
 * @param {number} offset The bit offset within the buffer to append at
 * @returns The encoded buffer and the offset for the next field within it
 */
function encode(field, value, buffer, offset) {
  if (typeof value != 'number' ||
      value < 0 || value > (2**field.size - 1)) {
    throw new Error('Invalid unsigned integer value for size');
  }
  return appendBits(int2bits(value, field.size), buffer, offset);
}

module.exports = { decode, encode };