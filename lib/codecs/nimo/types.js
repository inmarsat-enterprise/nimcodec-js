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
 * @typedef {Object} Field
 * @property {String} name Unique name for the field within a Message
 * @property {String} type A valid field type value from FieldType
 * @property {String} [description] Optional description
 * @property {number} [size] Type-specific requirement/interpretation
 * @property {boolean} [optional] Flag allowing optional presence of the field
 * @property {boolean} [fixed] Type-specific optional flag for fixed-size
 *    `string`, `data` or `array`
 * @property {String[]} [items] Required for `enum` type only
 * @property {Field[]} [fields] Required for `array` and `bitkeylist` types
 */

/**
 * Message definition.
 * Typically include 1 or more `Field` but could represent a 2-byte command.
 * @typedef {Object} Message
 * @property {number} messageKey Directionally-unique within Service [0..255].
 *    2nd byte of raw payload sent over-the-air.
 * @property {String} name Unique within Service
 * @property {String} [description] Optional description
 * @property {Field[]} fields List of Fields comprising the message content
 */

/**
 * `Service` definition must have at least 1 `Message` in uplink or downlink.
 * Message keys can be reused between uplink or downlink though the intent is
 * to match downlink command with uplink response.
 * @typedef {Object} Service
 * @property {number} serviceKey Unique within NimCodec [0..255].
 *    1st byte of raw payload sent over-the-air. 0..15 reserved for system use.
 * @property {String} name Unique within NimCodec
 * @property {String} [description] Optional description
 * @property {Message[]} [uplinkMessages] Mobile-Originated Messages
 * @property {Message[]} [downlinkMessages] Mobile-Terminated Messages
 */

/**
 * NIM Codec definition
 * @typedef {Object} NimCodec
 * @property {Object} nimCodecKey Common tag indicating NIM codec definition
 * @property {Service[]} nimCodecKey.services The list of Service definitions
 */