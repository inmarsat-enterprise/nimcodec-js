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
  if (typeof field.enum !== 'object' ||
      Array.isArray(field.enum) ||
      field.enum === null)
    throw new Error('Invalid field.enum must be object')
  if (!Object.keys(field.enum).every(k => !isNaN(Number(k)) && Number(k) % 1 === 0) ||
      !Object.values(field.enum).every(v => typeof v === 'string' && v.length > 0)) {
    throw new Error('Bitmask enumeration must have integer keys and string values');
  }
  if (Object.keys(field.enum).length > field.size) {
    throw new Error('Field items must be equal or smaller length than size');
  }
  const eValues = Object.values(field.enum);
  const duplicates = eValues.filter((item, idx) => {
    return eValues.indexOf(item) !== idx;
  });
  if (duplicates.length > 0)
    throw new Error('Values must be unique');
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
  for (const [k, v] of Object.entries(field.enum)) {
    if (bits[Number(k)] === 1) {
      const row = {};
      row[v] = {};
      for (const f of field.fields) {
        let decoded;
        ({decoded, offset} = decodeField(f, buffer, offset));
        row[v][decoded.name] = decoded.value;
      }
      value.push(row);
    }
  }
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
  if (!Array.isArray(value) ||
      !value.every(row => typeof row === 'object' && row !== null))
    throw new Error('Invalid bitmaskarray');
  if (value.length > field.size)
    throw new Error('Array to large for field size');
  for (const row of value) {
    for (const [k, v] of Object.entries(row)) {
      if (!Object.values(field.enum).includes(k) ||
          typeof v !== 'object' || v === null)
        throw new Error('Invalid bitmaskarray');
    }
  }
  // calculate bitmask and encode as uint of size field.size
  let bitmask = 0;
  value.forEach(row => {
    const bitName = Object.keys(row)[0];
    for (const [k, v] of Object.entries(field.enum)) {
      if (v === bitName)
        bitmask += 2**Number(k);
    }
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