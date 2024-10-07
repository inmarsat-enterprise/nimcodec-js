/**
 * An integer bitmask maps to an array of strings to identify each bit,
 * followed by an array of length (rows) equal to the bits set.
 * The fields defined in the array represent columns for each row.
 * 
 * Example: `["bit0": {"kpi1": 1, "kpi2": 2}, "bit3": {"kpi4": 1, "kpi5": 2}]`
 * @namespace field.bitkeylist
 */
const { int2bits, extractBits } = require('../../../bitman');
const {
  decodeField,
  encodeField,
} = require('./common');
const Types = require('../types');

/** @type {Types.Field} */

/**
 * Validate the field configuration for bitkeylist
 * @memberof field.bitkeylist
 * @private
 * @param {Field} field 
 */
function validateField(field) {
  if (!Array.isArray(field.items)) {
    throw new Error('Field items must be an Array');
  }
  if (field.items.length > field.size) {
    throw new Error('Field items must be equal or smaller length than size');
  }
  const checkSet = new Set(field.items);
  if (checkSet.size != field.items.length ||
      !field.items.every(i => typeof i === 'string')) {
    throw new Error('Field items must contain unique bit-indexed strings');
  }
}

/**
 * Decode a bitmask-defined array field
 * @memberof field.bitkeylist
 * @private
 * @param {Field} field The field definition
 * @param {number} field.size The bitmask size in bits
 * @param {String[]} [field.items] The bit/tag definitions
 * @param {Field[]} field.fields The fields of the array entries
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The start bit of the field in the buffer
 * @returns The decoded field value and the offset for the next read operation
 */
function decode(field, buffer, offset) {
  validateField(field);
  const bitmask = extractBits(buffer, offset, field.size);
  const bits = int2bits(bitmask, field.size).reverse();
  offset += field.size;
  const value = [];
  field.items.forEach((tag, i) => {
    if (bits[i] === 1) {
      const row = {};
      row[tag] = {};
      for (const f of field.fields) {
        let decoded;
        ({decoded, offset} = decodeField(f, buffer, offset));
        row[tag][decoded.name] = decoded.value;
      }
      value.push(row);
    }
  });
  return { value: value, offset: offset };
}

/**
 * Returns a subfield for the bitmask as an integer
 * @memberof field.bitkeylist
 * @private
 * @param {Field} field Field definition
 * @returns name, type and size in an object
 */
function subField(field) {
  return {
    name: 'subField',
    type: 'uint',
    size: field.size,
  };
}

/**
 * Encode a Bit Keyed List field
 * @memberof field.bitkeylist
 * @private
 * @param {Field} field The field definition
 * @param {Array} value The value to encode
 * @param {Buffer} buffer The buffer to append to
 * @param {number} offset The bit offset within the buffer to append at
 * @returns The encoded buffer and the offset for the next field within it
 */
function encode(field, value, buffer, offset) {
  validateField(field);
  if (!Array.isArray(value)) throw new Error('Invalid bitkeylist');
  value.forEach((row) => {
    for (const key of Object.keys(row)) {
      if (!field.items.includes(key)) throw new Error('Invalid bitkey value');
    }
  });
  if (value.length > field.size) throw new Error('Array to large for field size');
  // calculate bitmask and encode as uint of size field.size
  let bitmask = 0;
  value.forEach(row => {
    const bitName = Object.keys(row)[0];
    const iBit = field.items.indexOf(bitName);
    bitmask += 2**iBit;
  });
  ({buffer, offset} = encodeField(subField(field), bitmask, buffer, offset));
  value.forEach((row) => {
    for (const [k, v] of Object.entries(Object.values(row)[0])) {
      field.fields.forEach((f) => {
        if (f.name === k) {
          ({buffer, offset} = encodeField(f, v, buffer, offset));
        }
      });
    }
  });
  return { buffer: buffer, offset: offset };
}

module.exports = { decode, encode };