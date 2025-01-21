/**
 * Functions related to message encoding/decoding
 */

const { extractBits, appendBits, int2bits } = require('../../bitman');
const { decodeField, encodeField } = require('./field/common');
const { FieldType, MessageDirection } = require('./types');

/**
 * Decode a message from its raw buffer/payload using a specified codec.
 * @memberof cbc
 * @param {Buffer} buffer Bytes of the message payload
 * @param {CbcCodec|Message} codec The codec with messages, or Message codec
 * @param {boolean} [isMo] Set if the message is Mobile-Originated (default true)
 * @param {number} [coapMessageId] Set if the message is CoAP-compatible (default false)
 * @returns A decoded message object
 */
function decodeMessage(buffer, codec, isMo = true, coapMessageId = undefined) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 1)
    throw new Error('Invalid message buffer');
  let msgCodec;
  const decoded = {};
  let offset = 0;
  decoded.direction = isMo ? MessageDirection.MO : MessageDirection.MT;
  // TODO check if first byte starts with 0b01 then CoAP
  if (typeof coapMessageId !== 'number') {
    decoded.messageKey = extractBits(buffer, 0, 16);
    offset = 16;
  } else {   // CoAP
    decoded.messageKey = coapMessageId;
  }
  if (Object.hasOwn(codec, 'messages')) {
    const msgCodecs = codec.messages.filter(m => {
      return m.direction === decoded.direction && m.messageKey === decoded.messageKey;
    });
    if (msgCodecs.length !== 1)
      throw new Error(`Unsupported ${decoded.direction} message key ${messageKey}`);
    msgCodec = msgCodecs[0];
  } else {
    msgCodec = codec;
  }
  decoded.name = msgCodec.name;
  decoded.value = {};
  for (const fieldCodec of msgCodec.fields) {
    let field;
    ({ decoded: field, offset } = decodeField(fieldCodec, buffer, offset));
    if (field)
      decoded.value[field.name] = field.value;
  }
  return decoded;
}

/**
 * Get the specified Field from the Message using its name to match
 * @private
 * @param {Message} encoded The message object to search
 * @param {Object} encoded.value The message field key/value pairs
 * @param {Field} fieldDef The field definition to search for
 * @returns {any}
 */
function getFieldValue(encoded, fieldDef) {
  for (const [k, v] of Object.entries(encoded.value)) {
    if (k === fieldDef.name) return v;
  }
}

/**
 * Encode a `Message` object to a bytes buffer using the specified codec.
 * @memberof cbc
 * @param {Message} message The `Message` object to encode
 * @param {CbcCodec|Message} codec The codec with messages, or Message codec
 * @param {boolean} [isMo] Set if the message is Mobile-Originated (default false)
 * @param {boolean} [isCoap] Set if the message is CoAP-compatible (default false)
 * @returns {Buffer} The encoded message buffer
 * @throws If unable to process the codec or message
 */
function encodeMessage(message, codec, isMo = false, isCoap = false) {
  if (!Object.hasOwn(message, 'name'))
    throw new Error('Message name missing');
  let msgCodec;
  const direction = isMo ? 'UPLINK' : 'DOWNLINK';
  if (Object.hasOwn(codec, 'messages')) {
    const msgCodecs = codec.messages.filter(m => {
      return m.direction === message.direction && m.name === message.name;
    });
    if (msgCodecs.length !== 1)
      throw new Error('No valid codec for message');
    msgCodec = msgCodecs[0];
  } else {
    msgCodec = codec;
  }
  let buffer = Buffer.from([0]);
  let offset = 0;
  if (!isCoap) {
    ({buffer, offset} = appendBits(int2bits(msgCodec.messageKey, 16), buffer, offset));
  } else {
    console.warn(`Insert Message ID ${msgCodec.messageKey} in CoAP header using coap library`);
  }
  for (const fieldCodec of msgCodec.fields) {
    const value = getFieldValue(message, fieldCodec);
    ({buffer, offset} = encodeField(fieldCodec, value, buffer, offset));
  }
  return buffer;
}

module.exports = { decodeMessage, encodeMessage };