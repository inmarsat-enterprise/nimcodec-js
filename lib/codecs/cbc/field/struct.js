/**
 * Arrays are variable-length data structures made up of rows and columns.
 * Fields of an array define the column contents.
 * 
 * Example:
 * `[{"col1": "val1", "col2": "val2"},{"col1": "val3", "col2": "val4"}]`
 * @namespace field.struct
 */
const { decodeField, encodeField } = require('./common');

/**
 * Decode an array field
 * @memberof field.struct
 * @private
 * @param {Field} field The field definition
 * @param {Field[]} field.fields The fields of the array
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The start bit of the field in the buffer
 * @returns A decoded field object and the offset for the next field
 */
function decode(field, buffer, offset) {
  const value = {};
  for (const f of field.fields) {
    let decoded;
    ({ decoded, offset } = decodeField(f, buffer, offset));
    value[decoded.name] = decoded.value;
  }
  return { value: value, offset: offset };
}

/**
 * Encodes an array field to a buffer
 * @memberof field.struct
 * @private
 * @param {Field} field The field definition
 * @param {Field[]} field.fields The list of fields supported in the struct
 * @param {Object} value The value to encode
 * @param {Field[]} value.fields The field values to encode
 * @param {Buffer} buffer The buffer to append to
 * @param {number} offset The bit offset within the buffer to append at
 * @returns The encoded buffer and the offset for the next field within it
 */
function encode(field, value, buffer, offset) {
  if (typeof value !== 'object' || value === null)
    throw new Error('Invalid struct');
  if (!Object.keys(value).every(k => field.fields.filter(f => f.name === k).length > 0))
    throw new Error('Key not found in fields');
  for (const subField of field.fields) {
    const fValue = value[subField.name];
    ({buffer, offset} = encodeField(subField, fValue, buffer, offset));
  }
  return { buffer: buffer, offset: offset };
}

module.exports = { decode, encode };