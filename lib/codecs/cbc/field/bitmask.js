/**
 * Enumeration field provides a string representation of an integer value for
 * abstraction.
 * @namespace field.bitmask
 */
const { appendBits, int2bits, extractBits, isInt } = require('../../../bitman');
const Types = require('../types');

/** @type {Types.Field} */

/**
 * Decode a bitmask field
 * @memberof field.bitmask
 * @private
 * @param {Field} field The field definition
 * @param {Object} field.enum The bit enumeration map e.g. { '0': 'bit0' }
 *  where key must be a parsable integer and value must be a string
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The start bit of the field in the buffer
 * @returns The string value and the bit offset for the next read operation
 */
function decode(field, buffer, offset) {
  const bitmask = extractBits(buffer, offset, field.size);
  const setValues = [];
  for (const [b, v] of Object.entries(field.enum)) {
    const bitIndex = Number(b);
    if ((bitmask & (1 << bitIndex)) !== 0)
      setValues.push(v);
  }
  return {
    value: setValues,
    offset: offset + field.size,
  };
}

/**
 * Encode a bitmask field
 * @memberof field.bitmask
 * @private
 * @param {Field} field The field definition
 * @param {Object} field.enum The bit enumeration map e.g. { '0': 'bit0' }
 *  where key must be a parsable integer and value must be a string
 * @param {String|number} value The value to encode (string or `enum` key)
 * @param {Buffer} buffer The buffer to append to
 * @param {number} offset The bit offset within the buffer to append at
 * @returns The encoded buffer and the offset for the next field within it
 */
function encode(field, value, buffer, offset) {
  if (!isInt(value) && !Array.isArray(value))
    throw new Error('Invalid bitmask must be integer or array of strings');
  let bitmask;
  if (Array.isArray(value)) {
    if (!value.every(e => Object.values(field.enum).includes(e)))
      throw new Error('Invalid bit key in value');
    bitmask = 0;
    for (const [k, v] of Object.entries(field.enum)) {
      if (value.includes(v))
        bitmask = bitmask | 1 << Number(k);
    }
  } else {
    bitmask = Number(value);
  }
  if (Math.log2(bitmask) > field.size)
    throw new Error('Invalid bitmask exceeds field size');
  return appendBits(int2bits(bitmask, field.size), buffer, offset);
}

module.exports = { decode, encode };