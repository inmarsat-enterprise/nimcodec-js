/**
 * Type definitions for readability
 * @namespace types
 */
/**
 * Enumeration of types (placeholder)
 * @typedef {Object} FieldType
 * @memberof types
 */
const FieldType = Object.freeze({
  BOOLEAN: 'bool',
  ENUM: 'enum',
  DATA: 'data',
  STRING: 'string',
  ARRAY: 'array',
  INT: 'int',
  UINT: 'uint',
  BITKEYLIST: 'bitkeylist',
});

/**
 * Field definition. Certain type-specific properties are required.
 * @memberof types
 * @typedef {Object} FieldCodec
 * @property {String} name Unique name for the field within a Message
 * @property {String} type A valid field type value from FieldType
 * @property {String} [description] Optional description
 * @property {number} [size] Type-specific requirement/interpretation
 * @property {boolean} [optional] Flag allowing optional presence of the field
 * @property {boolean} [fixed] Type-specific optional flag for fixed-size
 *    `string`, `data` or `array`
 * @property {String[]} [items] Required for `enum` type only
 * @property {FieldCodec[]} [fields] Required for `array` and `bitkeylist` types
 */

/**
 * Message definition.
 * Typically include 1 or more `Field` but could represent a 2-byte command.
 * @memberof types
 * @typedef {Object} MessageCodec
 * @property {number} messageKey Directionally-unique within Service [0..255].
 *    2nd byte of raw payload sent over-the-air.
 * @property {String} name Unique within Service
 * @property {String} [description] Optional description
 * @property {FieldCodec[]} fields List of Fields comprising the message content
 */

/**
 * @memberof types
 * @typedef ArrayFieldElement
 * @property {number} index The array index
 * @property {FieldDecoded[]} fields The content of the array element(s)
 */

/**
 * Decoded field JSON structure
 * @memberof types
 * @typedef FieldDecoded
 * @property {string} name The name of the data field (e.g. `latitude`)
 * @property {string} [value] Present if type is not `array`
 * @property {ArrayFieldElement[]} [elements] Present if type is `array`
 * @property {string} [type] The data type of the field
 */

/**
 * Decoded message JSON structure
 * @memberof types
 * @typedef {Object} MessageDecoded
 * @property {number} serviceKey aka SIN (Service Identification Number)
 * @property {number} messageKey aka MIN (Message Identification Number)
 * @property {string} name The name of the message (e.g. `positionReport`)
 * @property {boolean} [isForward] Optional flag set for Mobile-Terminated
 * @property {FieldDecoded[]} fields List of fields containing data
 */

/**
 * `Service` definition must have at least 1 `Message` in uplink or downlink.
 * Message keys can be reused between uplink or downlink though the intent is
 * to match downlink command with uplink response.
 * @memberof types
 * @typedef {Object} ServiceCodec
 * @property {number} serviceKey Unique within NimCodec [0..255].
 *    1st byte of raw payload sent over-the-air. 0..15 reserved for system use.
 * @property {String} name Unique within NimCodec
 * @property {String} [description] Optional description
 * @property {MessageCodec[]} [uplinkMessages] Mobile-Originated Messages
 * @property {MessageCodec[]} [downlinkMessages] Mobile-Terminated Messages
 */

/**
 * NIM Codec definition
 * @memberof types
 * @typedef {Object} NimoCodec
 * @property {Object} nimoCodecKey Common tag indicating NIM codec definition
 * @property {ServiceCodec[]} nimoCodecKey.services The list of Service definitions
 */

module.exports = {
  FieldType,
};