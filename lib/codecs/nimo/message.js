/**
 * Functions related to message encoding/decoding
 */
const {
  FieldType,
  FieldCodec,
  MessageCodec,
  MessageDecoded,
  NimoCodec,
} = require('./types.js');
const { importCodec } = require('./codeckey.js');
const { decodeField, encodeField } = require('./field/common');

// Parked code - overcomplicated
// function toLegacyFormat_(decoded, messageCodec) {
//   /**
//    * 
//    * @param {string} value 
//    * @param {FieldCodec} fieldCodec 
//    */
//   function enumToLegacy(value, fieldCodec) {
//     for (const [k, v] of fieldCodec.items.entries()) {
//       if (value === v) return `${k}`;
//     }
//   }

//   /**
//    * 
//    * @param {any} value 
//    * @param {object} field
//    * @param {FieldCodec} fieldCodec 
//    */
//   function arrayToLegacy(value, field, fieldCodec) {
//     field.type = 'array';
//     field.elements = [];
//     for (const [i, val] of value.entries()) {
//       const arrFieldDef = fieldCodec.fields[i];
//       const element = { index: i, fields: [] };
//       if (arrFieldDef.type === 'array' || Array.isArray(val)) {
//         element.fields.push(
//           arrayToLegacy(val, { name: arrFieldDef.name }, arrFieldDef)
//         );
//       } else if (arrFieldDef.type === 'enum') {
//         element.fields.push({
//           name: arrFieldDef.name,
//           type: 'enum',
//           value: enumToLegacy(val, arrFieldDef),
//         });
//       } else if (typeof val === 'object' && val !== null && val !== undefined) {
//         for (const nv1 of Object.values(val)) {
//           const elField = { name: arrFieldDef.name, type: arrFieldDef.type };
//           if (Array.isArray(nv1)) {
//             arrayToLegacy(nv1, elField, arrFieldDef);
//           } else if (typeof nv1 === 'object' && nv1 !== null && nv1 !== undefined) {
//             for (const nv2 of Object.values(nv1)) {
//               element.fields.push({ ...elField, value: `${nv2}` });
//             }
//           }
//         }
//       } else {
//         element.fields.push({
//           name: arrFieldDef.name,
//           type: arrFieldDef.type,
//           value: `${el}`,
//         });
//       }
//       field.elements.push(element);
//     }
//   }
  
//   const legacyDecoded = {
//     name: decoded.name,
//     SIN: decoded.serviceKey,
//     MIN: decoded.messageKey,
//     fields: [],
//   };
//   for (const [key, val] of Object.entries(decoded.value)) {
//     const fieldDef = messageCodec.fields.find(f => f.name === key);
//     const field = { name: key };
//     if (Array.isArray(val)) {
//       arrayToLegacy(val, field, fieldDef);
//     } else {
//       field.type = fieldDef.type,
//       field.value = fieldDef.type === 'enum'
//         ? enumToLegacy(val, fieldDef) 
//         : `${v}`;
//     }
//     legacyDecoded.fields.push(field);
//   }
//   return legacyDecoded;
// }

/**
 * Decode a message from its raw payload using a specified codec.
 * The codec may specify a path to a compliant XML or JSON file,
 * or be a compliant string or object conforming to `NimoCodec` structure.
 * @memberof nimo
 * @param {number[]|Buffer} payloadRaw Decimal bytes or Buffer sent over the air
 * @param {NimoCodec|string} codec The codec may be a file path, string or object
 * @param {boolean} [isMo] Indicates if the message was Mobile-Originated
 * @param {boolean} [legacy] If set, use the legacy SkyWave format (default false)
 * @returns {MessageDecoded} A decoded `Message` or empty object
 */
function decodeMessage(payloadRaw, codec, isMo = true, legacy = false) {
  if ((!Array.isArray(payloadRaw) && !Buffer.isBuffer(payloadRaw)) ||
      payloadRaw.length < 2 ||
      !payloadRaw.every((b => { return 0 <= b <= 255 }))) {
    throw new Error('Invalid raw payload must be unsigned 8-bit byte values');
  }
  codec = importCodec(codec);
  // let msgCodec;
  const svcKey = payloadRaw[0];
  const msgKey = payloadRaw[1];
  const decoded = {};
  for (const svcDef of codec.services) {
    if (svcDef.serviceKey != svcKey) continue;
    const msgType = `${isMo ? 'uplink' : 'downlink'}Messages`;
    for (const msgDef of svcDef[msgType]) {
      if (msgDef.messageKey != msgKey) continue;
      const buffer =
          Buffer.isBuffer(payloadRaw) ? payloadRaw : Buffer.from(payloadRaw);
      decoded.name = msgDef.name;
      if (msgDef.description) { decoded.description = msgDef.description; }
      decoded.serviceKey = svcKey;
      decoded.messageKey = msgKey;
      let offset = 16;   // Begin parsing after codec header (SIN, MIN)
      decoded.value = {};
      for (const fieldDef of msgDef.fields) {
        let field;
        ({ decoded: field, offset } = decodeField(fieldDef, buffer, offset));
        if (field) { decoded.value[field.name] = field.value; }
      }
      // msgCodec = msgDef;
      break;   // message found
    }
    break;   // service found
  }
  if (legacy) {
    throw new Error('Legacy mode not implemented');
    // return toLegacyFormat_(decoded, msgCodec);
  }
  return decoded;
}

/**
 * Encode a `Message` object to a bytes buffer using the specified codec.
 * @memberof nimo
 * @param {MessageDecoded} message The `Message` object to encode
 * @param {NimoCodec|String} codec The `NimoCodec` or file path to use
 * @param {boolean} isMo Set if the message is Mobile-Originated (default false)
 * @param {boolean} [legacy] If set, use the legacy SkyWave format (default false)
 * @returns {Buffer} The encoded message buffer
 * @throws If unable to process the codec or message
 */
function encodeMessage(message, codec, isMo = false, legacy = false) {
  codec = importCodec(codec);
  let msg = message;
  if (legacy || (!message.value && message.fields)) {
    throw new Error(`Legacy mode not supported`);
    msg = fromLegacy_(message);
    legacy = true;
  }
  let messageDef;
  const { serviceKey, messageKey } = msg;
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
    const value = msg.value[fieldDef.name];
    if (typeof value != 'undefined') {
      ({buffer, offset} = encodeField(fieldDef, value, buffer, offset));
    }
  }
  return buffer;
}

module.exports = { decodeMessage, encodeMessage };