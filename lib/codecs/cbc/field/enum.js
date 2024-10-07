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
 * @param {Object} field.enum The enumeration map e.g. { '0': 'ZERO' }
 *  where key must be a parsable integer and value must be a string
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The start bit of the field in the buffer
 * @returns The string value and the bit offset for the next read operation
 */
function decode(field, buffer, offset) {
  const key = `${extractBits(buffer, offset, field.size)}`;   // stringify for object key
  if (!Object.keys(field.enum).includes(key))
    throw new Error('Invalid key');
  return {
    value: field.enum[key],
    offset: offset + field.size,
  };
}

/**
 * Encode an enumerated field
 * @memberof field.enum
 * @private
 * @param {Field} field The field definition
 * @param {String|number} value The value to encode (string or `enum` key)
 * @param {Buffer} buffer The buffer to append to
 * @param {number} offset The bit offset within the buffer to append at
 * @returns The encoded buffer and the offset for the next field within it
 */
function encode(field, value, buffer, offset) {
  if (!['string', 'number'].includes(typeof value))
    throw new Error('Invalid enum value');
  if (typeof value === 'string') {
    if (!Object.values(field.enum).includes(value))
      throw new Error('Invalid enum value');
    for (const [k, v] of Object.entries(field.enum)) {
      if (v === value) {
        value = k;
        break;
      }
    }
  } else {
    value = `${value}`;   // stringify for object key lookup
  }
  if (!Object.keys(field.enum).includes(value))
    throw new Error('Invalid enum key');
  return appendBits(int2bits(value, field.size), buffer, offset);
}

module.exports = { decode, encode };