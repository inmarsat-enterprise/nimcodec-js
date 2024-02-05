const { appendBytes, extractBits } = require('./bitbang');
const { decodeFieldLength, encodeFieldLength } = require('./common');

/**
 * Decode a string field
 * @param {Field} field The field definition
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The start bit of the field in the buffer
 * @returns 
 */
function decode(field, buffer, offset) {
  let length = field.size;
  if (!field.fixed) {
    ({ length, offset } = decodeFieldLength(buffer, offset));
  }
  const value = extractBits(buffer, offset, 8*length, true);
  return { value: value.toString(), offset: offset + 8*length };
}

/**
 * 
 * @param {Field} field 
 * @param {String} value 
 * @param {Buffer} buffer 
 * @param {number} offset 
 * @returns 
 */
function encode(field, value, buffer, offset) {
  if (typeof value != 'string') throw new Error('Invalid string');
  if (value.length > field.size) throw new Error('String too long for field size');
  let pad;
  if (field.fixed && value.length < field.size) {
    pad = field.size - value.length;
  }
  let te = new TextEncoder();
  let bytes = Buffer.from(te.encode(value));
  if (pad) {
    let padBuf = Buffer.from(Array(pad).fill(0));
    bytes = Buffer.concat([bytes, padBuf]);
  }
  ({buffer, offset} = encodeFieldLength(bytes.length, buffer, offset));
  return appendBytes(bytes, buffer, offset);
}

module.exports = { decode, encode };