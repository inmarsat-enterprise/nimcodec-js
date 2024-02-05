const { importCodec } = require('./codeckey.js');
const { decodeField, encodeField } = require('./field/common');

/**
 * @typedef {import('./types.js').Message} Message
 */
/**
 * @typedef {import('./types.js').Field} Field
 */


/**
 * Decode a message from its raw payload using a specified codec.
 * The codec may specify a path to a compliant XML or JSON file,
 * or be a compliant string or object conforming to `Codec` structure.
 * @param {number[]|Buffer} payloadRaw Decimal bytes or Buffer sent over the air
 * @param {Codec|string} codec The codec may be a file path, string or object
 * @param {boolean} [isMo] Indicates if the message was Mobile-Originated
 * @returns A decoded `Message` or empty object
 */
function decodeMessage(payloadRaw, codec, isMo = true) {
  if ((!Array.isArray(payloadRaw) && !Buffer.isBuffer(payloadRaw)) ||
      payloadRaw.length < 2 ||
      !payloadRaw.every((b => { return 0 <= b <= 255 }))) {
    throw new Error('Invalid raw payload must be unsigned 8-bit byte values');
  }
  codec = importCodec(codec);
  const svcKey = payloadRaw[0];
  const msgKey = payloadRaw[1];
  const decoded = {};
  for (const svcDef of codec.services) {
    if (svcDef.serviceKey != svcKey) { continue; }
    const msgType = `${isMo ? 'uplink' : 'downlink'}Messages`;
    for (const msgDef of svcDef[msgType]) {
      if (msgDef.messageKey != msgKey) { continue; }
      const buffer =
          Buffer.isBuffer(payloadRaw) ? payloadRaw : Buffer.from(payloadRaw);
      decoded.name = msgDef.name;
      if (msgDef.description) { decoded.description = msgDef.description; }
      decoded.serviceKey = svcKey;
      decoded.messageKey = msgKey;
      let offset = 16;   // Begin parsing after codec header (SIN, MIN)
      decoded.fields = {};
      // let skip = false;
      // let dsize = undefined;
      for (const fieldDef of msgDef.fields) {
        // if (skip) {
        //   skip = false;
        //   continue;
        // }
        let field;
        ({ decoded: field, offset } = decodeField(fieldDef, buffer, offset));
        // const { field: decodedField, offset: newOffset, dmask } =
        //     decodeField(fCodec, buffer, offset, dsize);
        // offset = newOffset;
        // if (typeof dmask === 'number') {
        //   if (dmask === 0) {
        //     skip = true;
        //   } else {
        //     dsize = dmask;
        //   }
        // } else {
        //   dsize = undefined;
        // }
        if (field) { decoded.fields[field.name] = field.value; }
      }
      // decoded.fields = decodedFields;
      break;   // message found
    }
    break;   // service found
  }
  return decoded;
}

/**
 * Get the specified Field from the Message using its name to match
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
 * @param {Message} message The `Message` object to encode
 * @param {Codec|string} codec The `Codec` or file path to use
 * @param {boolean} isMo Set if the message is Mobile-Originated (default false)
 * @returns {Buffer} The encoded message buffer
 * @throws If unable to process the codec or message
 */
function encodeMessage(message, codec, isMo = false) {
  codec = importCodec(codec);
  let messageDef;
  const { serviceKey, messageKey } = message;
  for (const serviceDef of codec.services) {
    if (serviceDef.serviceKey === serviceKey) {
      const messageType = `${isMo ? 'uplink' : 'downlink'}Messages`; 
      for (const candidateMessageDef of serviceDef[messageType]) {
        if (candidateMessageDef.messageKey === messageKey) {
          messageDef = candidateMessageDef;
          break;
        }
      }
      if (messageDef) break;
    }
  }
  if (!messageDef) throw new Error('Unable to encode');
  let buffer = Buffer.from([serviceKey, messageKey]);
  let offset = 16;
  for (const fieldDef of messageDef.fields) {
    const value = getFieldValue(message, fieldDef);
    if (typeof value != 'undefined') {
      ({buffer, offset} = encodeField(fieldDef, value, buffer, offset));
    }
  }
  return buffer;
}

module.exports = { decodeMessage, encodeMessage };