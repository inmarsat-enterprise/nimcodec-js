/**
 * ASCII character string of variable or fixed length. Fixed length are padded
 * with non-printable (0) characters.
 * @namespace field.string
 */
const { appendBytes, extractBits } = require('../../../bitman');
const { decodeFieldLength, encodeFieldLength } = require('./common');
const Types = require('../types');

/** @type {Types.Field} */

/**
 * Decode a string field
 * @memberof field.string
 * @private
 * @param {Field} field The field definition
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The start bit of the field in the buffer
 * @returns The value and the bit offset for the next read operation
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
 * Encode a string field
 * @memberof field.string
 * @private
 * @param {Field} field The field definition
 * @param {String} value The value to encode
 * @param {Buffer} buffer The buffer to append to
 * @param {number} offset The bit offset within the buffer to append at
 * @returns The encoded buffer and the offset for the next field within it
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