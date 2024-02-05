const { dec2bits, extractBits } = require('./bitbang');
const {
  decodeFieldLength,
  encodeFieldLength,
  decodeField,
  encodeField,
  defaultFieldValue,
} = require('./common');

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
 * An array of strings maps to bits representing a length of the array field
 * The fields defined will include 1 row each of the specified columns
 * Example using txMetricsReport:
 * ['ack', '0533', '0550', '0575', 'reserved', '133', '150']
 */
/**
 * Decode a bitmask-defined array field
 * @param {Field} field The field definition
 * @param {number} field.size The bitmask size in bits
 * @param {String[]} [field.bits] The bit/tag definitions
 * @param {Field[]} field.fields The fields of the array entries
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The start bit of the field in the buffer
 * @returns 
 */
function decode(field, buffer, offset) {
  validateField(field);
  const bitmask = extractBits(buffer, offset, field.size);
  const bits = dec2bits(bitmask, field.size).reverse();
  offset += field.size;
  const value = [];
  // value.bitmask = bitmask;   // TBD remove?
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

function subField(field) {
  return {
    name: 'subField',
    type: 'uint',
    size: field.size,
  };
}

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