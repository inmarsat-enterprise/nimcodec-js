const { appendBits, dec2bits, extractBits } = require('./bitbang');

/**
 * Decode a signed integer field
 * @param {Field} field The field definition
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The start bit of the field in the buffer
 * @returns 
 */
function decode(field, buffer, offset) {
  let value = extractBits(buffer, offset, field.size);
  if ((value & (1 << (field.size - 1))) != 0) {
    value = value - (1 << field.size);
  }
  return { value: value, offset: offset + field.size };
}

/**
 * 
 * @param {Field} field 
 * @param {number} value 
 * @param {Buffer} buffer 
 * @param {number} offset 
 * @returns 
 */
function encode(field, value, buffer, offset) {
  if (typeof value != 'number' ||
      value < -(2**field.size / 2) || value > (2**field.size / 2 - 1)) {
    throw new Error('Invalid signed integer value for size');
  }
  return appendBits(dec2bits(value, field.size), buffer, offset);
}

module.exports = { decode, encode };