/**
 * Data field carries an arbitrary binary data buffer
 * @namespace field.data
 */
const { appendBytes, extractBits } = require('../../../bitman');
const { decodeFieldLength, encodeFieldLength } = require('./common');
const Types = require('../types');

/** @type {Types.Field} */

/**
 * Decode a data field
 * @memberof field.data
 * @private
 * @param {Field} field The field definition
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The start bit of the field in the buffer
 * @returns The decoded value and the offset for the next read operation
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
 * Encode a data field
 * @memberof field.data
 * @private
 * @param {Field} field The field definition
 * @param {Buffer} value The value to encode
 * @param {Buffer} buffer The buffer to append to
 * @param {number} offset The bit offset within the buffer to append at
 * @returns The encoded buffer and the offset for the next field within it
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