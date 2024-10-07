/**
 * Type definitions for readability
 * @namespace cbc.types
 */

/**
 * Enumeration of field types
 * @typedef {Object} FieldType
 * @memberof cbc.types
 */
const FieldType = Object.freeze({
  BOOLEAN: 'bool',
  INT: 'int',
  UINT: 'uint',
  FLOAT: 'float',
  ENUM: 'enum',
  BITMASK: 'bitmask',
  STRING: 'string',
  DATA: 'data',
  ARRAY: 'array',
  STRUCT: 'struct',
  BITMASKARRAY: 'bitmaskarray',
});

/**
 * Enumeration of message direction
 * @typedef {Object} MessageDirection
 * @memberof cbc.types
 */
const MessageDirection = Object.freeze({
  MO: 'UPLINK',
  MT: 'DOWNLINK',
});

/**
 * Field definition. Certain type-specific properties are required.
 * @memberof cbc.types
 * @typedef {Object} Field
 * @property {String} name Unique name for the field within a Message
 * @property {String} type A valid field type value from FieldType
 * @property {String} [description] Optional description
 * @property {number} [size] Type-specific requirement/interpretation
 * @property {boolean} [optional] Flag allowing optional presence of the field
 * @property {boolean} [fixed] Type-specific optional flag for fixed-size
 *    `string`, `data` or `array`
 * @property {Object} [enum] Integer-keyed strings required for the `enum` type
 * @property {Field[]} [fields] Required for `struct`, `array` and `bitkeylist`
 * @property {String} [calc] Simplified math expression used to calculate value
 *    from raw binary
 * @property {*} [value]
 */

/**
 * Message definition.
 * Typically include 1 or more `Field` but could represent a 1-byte message.
 * @memberof cbc.types
 * @typedef {Object} Message
 * @property {String} direction The MessageDirection
 * @property {number} versionId A primary key in the range 0..7
 * @property {number} typeId A secondary key in the range 0..31
 * @property {String} name Unique within the `CbcCodec`
 * @property {String} [description] Optional description
 * @property {Field[]} fields List of Fields comprising the message content
 */

/**
 * NIM Codec definition
 * @memberof cbc.types
 * @typedef {Message[]} Codec
 */

module.exports = { FieldType, MessageDirection };