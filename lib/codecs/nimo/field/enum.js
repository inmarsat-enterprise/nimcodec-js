/**
 * Enumeration field provides a string representation of an integer value for
 * abstraction.
 * @namespace field.enum
 */
const { appendBits, int2bits, extractBits } = require('../../../bitman');
const Types = require('../types');

/** @type {Types.Field} */

/**
 * Decode an enum field
 * @memberof field.enum
 * @private
 * @param {Field} field The field definition
 * @param {string[]} field.items The list of enumeration strings
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The start bit of the field in the buffer
 * @returns The string value and the bit offset for the next read operation
 */
function decode(field, buffer, offset) {
  const enumerations = field.items;
  if (!Array.isArray(enumerations) || enumerations.length < 1) {
    throw new Error('Invalid items for enumeration');
  } else if (!field.size) {
    throw new Error('Invalid size of enumeration');
  }
  return {
    value: enumerations[extractBits(buffer, offset, field.size)],
    offset: offset + field.size,
  };
}

/**
 * Encode an enumerated field
 * @memberof field.enum
 * @private
 * @param {Field} field The field definition
 * @param {String|number} value The value to encode (string or `items` index)
 * @param {Buffer} buffer The buffer to append to
 * @param {number} offset The bit offset within the buffer to append at
 * @returns The encoded buffer and the offset for the next field within it
 */
function encode(field, value, buffer, offset) {
  if (typeof value === 'string' && field.items.includes(value)) {
    value = field.items.indexOf(value);
  }
  if (typeof value === 'number' && 0 <= value < field.items.length) {
    return appendBits(int2bits(value, field.size), buffer, offset);
  } else {
    throw new Error('Invalid enum value');
  }
}

module.exports = { decode, encode };