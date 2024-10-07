/**
 * Field encoding/decoding submodules
 * @namespace field
 */
const { appendBits, int2bits, extractBits } = require('../../../bitman');
const Types = require('../types');

/** @type {Types.Field} */

/**
 * Get the default value for the field or type
 * @memberof field
 * @private
 * @param {Field} field 
 * @returns {any}
 */
function defaultFieldValue(field) {
  if (Object.hasOwn(field, 'default')) return field.default;
  if (field.type === 'bool') return false;
  const zeros = ['enum', 'int', 'uint'];
  if (zeros.includes(field.type)) return 0;
  if (field.type === 'string') return '';
  if (field.type === 'data') return Buffer.from([0]);
  if (field.type === 'array') return [];
}

/**
 * Get the length of a variable size field
 * @memberof field
 * @private
 * @param {Buffer} buffer 
 * @param {number} offset 
 * @returns Object with length of field and new bit offset in buffer
 */
function decodeFieldLength(buffer, offset) {
  const lFlag = extractBits(buffer, offset, 1);
  offset += 1;
  const lLen = lFlag ? 15 : 7;
  return {
    length: extractBits(buffer, offset, lLen),
    offset: offset + lLen,
  };
}

/**
 * Appends the field length `L` to the buffer
 * @memberof field
 * @private
 * @param {number} size The field size
 * @param {Buffer} buffer The buffer to append to
 * @param {number} offset The bit offset to append at
 * @returns The resulting buffer and bit offset for the next write operation
 */
function encodeFieldLength(size, buffer, offset) {
  let bits = int2bits(size, size < 128 ? 8 : 16);
  if (size > 127) bits[0] = 1;
  ({buffer, offset} = appendBits(bits, buffer, offset));
  return { buffer: buffer, offset: offset };
}

/**
 * Decode a field to an object
 * @memberof field
 * @private
 * @param {Field} field The field definition
 * @param {boolean} [field.optional] Optional flag indicating optional presence
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The starting bit of the field in the buffer
 * @returns A decoded field object and the bit offset for the next read operation
 */
function decodeField(field, buffer, offset) {
  field.type = field.type.replace('Field', '').toLowerCase();
  const decoder = require(`./${field.type}`).decode;
  let fieldPresent = 1;
  if (Object.hasOwn(field, 'optional')) {
    fieldPresent = extractBits(buffer, offset, 1);
    offset += 1;
  }
  let decoded;
  let value;
  if (fieldPresent) {
    decoded = { name: field.name, type: field.type };
    ({value, offset} = decoder(field, buffer, offset));
    if (Object.hasOwn(field, 'description')) {
      decoded.description = field.description;
    }
    decoded.value = value;
  }
  return { decoded: decoded, offset: offset };
}

/**
 * Encode a field based on its type
 * @memberof field
 * @private
 * @param {Field} field The field definition
 * @param {Array} value The value to encode
 * @param {Buffer} buffer The buffer to append to
 * @param {number} offset The bit offset within the buffer to append at
 * @returns The encoded buffer and the offset for the next field within it
 */
function encodeField(field, value, buffer, offset) {
  field.type = field.type.replace('Field', '').toLowerCase();
  const encoder = require(`./${field.type}`).encode;
  if (Object.hasOwn(field, 'optional')) {
    if (field.optional != false) {
      const present = typeof value != 'undefined' ? 1 : 0;
      ({buffer, offset} = appendBits([present], buffer, offset));
    }
  }
  return encoder(field, value, buffer, offset);
}

module.exports = {
  decodeFieldLength,
  encodeFieldLength,
  decodeField,
  encodeField,
  defaultFieldValue,
};