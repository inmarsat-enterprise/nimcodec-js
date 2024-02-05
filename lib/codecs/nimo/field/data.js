const { appendBytes, extractBits } = require('./bitbang');
const { decodeFieldLength, encodeFieldLength } = require('./common');

/**
 * Decode a data field
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
  return { value: value, offset: offset + 8*length };
}

/**
 * 
 * @param {Field} field 
 * @param {Buffer} value 
 * @param {Buffer} buffer 
 * @param {number} offset 
 * @returns 
 */
function encode(field, value, buffer, offset) {
  if (!Buffer.isBuffer(value)) throw new Error('Invalid data buffer');
  if (value.length > field.size) throw new Error('Data too long for field size');
  let pad;
  if (field.fixed && value.length < field.size) {
    pad = field.size - value.length;
  }
  if (pad) {
    let padBuf = Buffer.from(Array(pad).fill(0));
    value = Buffer.concat([value, padBuf]);
  }
  ({buffer, offset} = encodeFieldLength(value.length, buffer, offset));
  return appendBytes(value, buffer, offset);
}

module.exports = { decode, encode };