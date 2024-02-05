const { extractBits } = require('./bitbang');
const {
  decodeFieldLength,
  encodeFieldLength,
  decodeField,
  encodeField,
  defaultFieldValue,
} = require('./common');

/**
 * Decode an array field
 * @param {Field} field The field definition
 * @param {number} field.size The maximum size of the array
 * @param {boolean} [field.fixed] Flag sets a fixed-size array
 * @param {Field[]} field.fields The fields of the array
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The start bit of the field in the buffer
 * @returns 
 */
function decode(field, buffer, offset) {
  let length = field.size;
  if (!field.fixed) {
    ({ length, offset } = decodeFieldLength(buffer, offset));
  }
  const value = [];
  for (let row = 0; row < length; row++) {
    const element = {};
    for (const f of field.fields) {
      let fPresent = true;
      if (Object.hasOwn(f, 'optional')) {
        fPresent = extractBits(buffer, offset, 1);
        offset += 1;
      }
      if (!fPresent) { continue; }
      let decoded;
      ({ decoded, offset } = decodeField(f, buffer, offset));
      element[decoded.name] = decoded.value;
    }
    if (element) { value.push(element); }
  }
  return { value: value, offset: offset };
}

/**
 * Encodes an array field to a buffer
 * @param {Field} field 
 * @param {Array} value 
 * @param {Buffer} buffer 
 * @param {number} offset 
 * @returns 
 */
function encode(field, value, buffer, offset) {
  if (!Array.isArray(value)) throw new Error('Invalid array');
  if (value.length > field.size) throw new Error('Array to large for field size');
  const length = field.fixed ? field.size : value.length;
  ({buffer, offset} = encodeFieldLength(length, buffer, offset));
  value.forEach((row) => {
    field.fields.forEach((f) => {
      ({buffer, offset} = encodeField(f, row[f.name], buffer, offset));
    });
  });
  if (value.length < length) {
    for (let i = value.length - 1; i < field.size; i++) {
      for (const f of field.fields) {
        ({buffer, offset} = encodeField(f, defaultFieldValue(f), buffer, offset));
      }
    }
  }
  return { buffer: buffer, offset: offset };
}

module.exports = { decode, encode };