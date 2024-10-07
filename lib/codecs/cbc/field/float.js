/**
 * Unsigned integer of user-definable size (payload bits).
 * @namespace field.float
 */
const { appendBytes, extractBits } = require('../../../bitman');
const Types = require('../types');

/** @type {Types.Field} */

/**
 * Decode an unsigned integer field
 * @memberof field.float
 * @private
 * @param {Field} field The field definition
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The start bit of the field in the buffer
 * @returns The decoded value and the bit offset for the next read operation
 */
function decode(field, buffer, offset) {
  let value = extractBits(buffer, offset, field.size, true);
  return { value: value.readFloatBE(), offset: offset + field.size };
}

/**
 * Encode an unsigned integer field
 * @memberof field.float
 * @private
 * @param {Field} field The field definition
 * @param {number} value The value to encode
 * @param {Buffer} buffer The buffer to append to
 * @param {number} offset The bit offset within the buffer to append at
 * @returns The encoded buffer and the offset for the next field within it
 */
function encode(field, value, buffer, offset) {
  if (value !== +value || (value | 0) === value) {
    throw new Error('Invalid float');
  }
  let fBuffer = Buffer.allocUnsafe(4);
  fBuffer.writeFloatBE(value);
  return appendBytes(fBuffer, buffer, offset);
}

module.exports = { decode, encode };