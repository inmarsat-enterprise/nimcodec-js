const { appendBits, extractBits } = require('./bitbang');

/**
 * Decode a boolean field
 * @param {Field} field The field definition
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The start bit of the field in the buffer
 * @returns 
 */
function decode(field, buffer, offset) {
  const value = extractBits(buffer, offset, 1) ? true : false;
  return { value: value, offset: offset + 1 };
  // return decodeCommon(field, value, offset + 1);
}

function encode(field, value, buffer, offset) {
  if (typeof value != 'boolean') throw new Error('Invalid boolean value');
  return appendBits([value ? 1 : 0], buffer, offset);
}

module.exports = { decode, encode };