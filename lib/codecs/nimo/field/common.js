const { appendBits, dec2bits, extractBits } = require('./bitbang');

// const decoders = {
//   'arrayField': require('./array').decode,
//   'bitmaskArrayField': require('./bitmaskarray').decode,
//   'boolField': require('./bool').decode,
//   'dataField': decodeDataField,
//   'enumField': decodeEnumField,
//   'intField': decodeIntField,
//   'stringField': decodeStringField,
//   'uintField': decodeUintField,
// };

// const encoders = {
//   'arrayField': encodeArrayField,
//   'boolField': encodeBoolField,
//   'dataField': encodeDataField,
//   'enumField': encodeEnumField,
//   'intField': encodeIntField,
//   'stringField': encodeStringField,
//   'uintField': encodeUintField,
// };

/**
 * Get the default value for the field or type
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
 * @param {number} size The field size
 * @param {Buffer} buffer The buffer to append to
 * @param {number} offset The bit offset to append at
 * @returns 
 */
function encodeFieldLength(size, buffer, offset) {
  let bits = dec2bits(size, size < 128 ? 8 : 16);
  if (size > 127) bits[0] = 1;
  ({buffer, offset} = appendBits(bits, buffer, offset));
  return { buffer: buffer, offset: offset };
}

/**
 * Decode a field to an object
 * @param {Field} field The field definition
 * @param {boolean} [field.optional] Optional flag indicating optional presence
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The starting bit of the field in the buffer
 * @returns A decoded field object
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
 * 
 * @param {Field} field 
 * @param {any} value 
 * @param {Buffer} buffer 
 * @param {number} offset 
 * @returns 
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