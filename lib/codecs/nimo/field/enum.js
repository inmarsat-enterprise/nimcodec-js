const { appendBits, dec2bits, extractBits } = require('./bitbang');

/**
 * Decode an enum field
 * @param {Field} field The field definition
 * @param {string[]} field.items The list of enumeration strings
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The start bit of the field in the buffer
 * @returns 
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
 * 
 * @param {Field} field 
 * @param {String|number} value 
 * @param {Buffer} buffer 
 * @param {number} offset 
 * @returns 
 */
function encode(field, value, buffer, offset) {
  if (typeof value === 'string' && field.items.includes(value)) {
    value = field.items.indexOf(value);
  }
  if (typeof value === 'number' && 0 <= value < field.items.length) {
    return appendBits(dec2bits(value, field.size), buffer, offset);
  } else {
    throw new Error('Invalid enum value');
  }
}

module.exports = { decode, encode };