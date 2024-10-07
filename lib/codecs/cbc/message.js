/**
 * Functions related to message encoding/decoding
 */

const { decodeField, encodeField } = require('./field/common');
const { FieldType, MessageDirection } = require('./types');

/**
 * Decode a message from its raw buffer/payload using a specified codec.
 * @memberof cbc
 * @param {Buffer} buffer Bytes of the message payload
 * @param {Codec|string} codec The codec list or file path, string
 * @param {boolean} [isMo] Indicates if the message is Mobile-Originated
 * @returns A decoded message object
 */
function decodeMessage(buffer, codec, isMo = true) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 1)
    throw new Error('Invalid message buffer');
  const decoded = {};
  decoded.direction = isMo ? MessageDirection.MO : MessageDirection.MT;
  decoded.messageKey = buffer[0];
  const msgCodecs = codec.filter(c => {
    return (
      c.messageKey === decoded.messageKey &&
      c.direction === decoded.direction
    );
  });
  if (msgCodecs.length !== 1)
    throw new Error(`Unsupported ${decoded.direction} prefix byte ${buffer[0]}`);
  const msgCodec = msgCodecs[0];
  decoded.name = msgCodec.name;
  let offset = 8;
  decoded.fields = {};
  for (const fieldCodec of msgCodec.fields) {
    let field;
    ({ decoded: field, offset } = decodeField(fieldCodec, buffer, offset));
    if (field)
      decoded.fields[field.name] = field.value;
  }
  return decoded;
}

/**
 * Get the specified Field from the Message using its name to match
 * @private
 * @param {Message} message The message object to search
 * @param {Field} fieldDef The field definition to search for
 * @returns {any}
 */
function getFieldValue(message, fieldDef) {
  for (const [k, v] of Object.entries(message.fields)) {
    if (k === fieldDef.name) return v;
  }
}

/**
 * Encode a `Message` object to a bytes buffer using the specified codec.
 * @memberof cbc
 * @param {Message} message The `Message` object to encode
 * @param {NimoCodec|String} codec The `NimoCodec` or file path to use
 * @param {boolean} [isMo] Set if the message is Mobile-Originated (default false)
 * @returns {Buffer} The encoded message buffer
 * @throws If unable to process the codec or message
 */
function encodeMessage(message, codec, isMo = false) {
  const direction = isMo ? 'UPLINK' : 'DOWNLINK';
  const msgCodecs = codec.filter(c => {
    return (
      c.direction === direction &&
      c.name === message.name
    );
  });
  if (msgCodecs.length !== 1)
    throw new Error('No valid codec for message');
  const msgCodec = msgCodecs[0];
  let buffer = Buffer.from([msgCodec.messageKey]);
  let offset = 8;
  for (const fieldCodec of msgCodec.fields) {
    const value = getFieldValue(message, fieldCodec);
    if (typeof value != 'undefined')
      ({buffer, offset} = encodeField(fieldCodec, value, buffer, offset));
  }
  return buffer;
}

module.exports = { decodeMessage, encodeMessage };