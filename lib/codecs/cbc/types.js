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
 * @property {String} [encalc] Simplified math expression used to encode value
 *    to optimized integer
 * @property {String} [decalc] Simplified math expression used to decode value
 *    from optimized integer
 * @property {*} [value]
 */

/**
 * Message definition.
 * Typically include 1 or more `Field` but could represent a 1-byte message.
 * @memberof cbc.types
 * @typedef {Object} Message
 * @property {String} name Unique within the `CbcCodec`
 * @property {String} [description] Optional description
 * @property {String} direction The MessageDirection
 * @property {number} messageKey A 16-bit message codec identifier
 * @property {Field[]} fields List of Fields comprising the message content
 * @property {number} [coapVersion] 2-bit unsigned value required for CoAP.
 *  If present must be 1.
 * @property {number} [coapType] 2-bit unsigned value required for CoAP.
 *  Supports `CON`(0), `NON`(1), `ACK`(2), `RST`(3)
 * @property {number} [coapTokenLength] 4-bit unsigned value 0..8. Required for
 *  CoAP.
 * @property {number} [coapCodeClass] 3-bit unsigned, should be 0. Required for
 *  CoAP.
 * @property {number} [coapCodeMethod] 5-bit unsigned, required for CoAP.
 *  Supports `GET`(1), `POST`(2), `PUT`(3), `DELETE`(4).
 */

/**
 * NIM Codec definition
 * @memberof cbc.types
 * @typedef {Object} CbcCodec
 * @property {String} application
 * @property {String} [version]
 * @property {String} [description]
 * @property {Message[]} messages
 */

module.exports = { FieldType, MessageDirection };