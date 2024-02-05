/**
 * Helpers for importing and validating NIM codec keys/files.
 */

const fs = require('fs');
const { xml2json } = require('xml-js');

const substitutions = {
  SIN: 'serviceKey',
  MIN: 'messageKey',
  'xsi:type': 'type',
  ForwardMessages: 'downlinkMessages',
  ReturnMessages: 'uplinkMessages',
  ArrayField: 'array',
  BooleanField: 'bool',
  DataField: 'data',
  EnumField: 'enum',
  UnsignedIntField: 'uint',
  SignedIntField: 'int',
  BitKeyListField: 'bitkeylist',
};

function getKeyByValue(obj, value) {
  return Object.keys(obj).find(key => obj[key] === value);
}

/**
 * Convert a key/string to camelCase representation
 * @param {String} original The string to convert
 * @param {boolean} skip_caps Set to avoid converting CAPITAL_CASE
 * @returns A camelCase representation
 */
function camelCase(original, skip_caps = false) {
  if (typeof original != 'string') throw new Error('Invalid string input');
  if (original.toUpperCase() === original && skip_caps) return original;
  const words = original.match(/[A-Z][a-z]+/g);
  if (words === null) return original;
  words[0] = words[0].toLowerCase();
  return words.join('');
}

/**
 * Convert an imported legacy Message Definition File to `NimCodec` key
 * @param {Object} obj A legacy Message Definition File converted to JSON object
 * @returns Simplified NimCodec Object
 */
function legacyMdfToCodec(obj) {
  try {
    if (typeof obj != 'object' || obj === null) return obj;
    if (Array.isArray(obj)) {
      if (!obj.every((el) => (typeof el === 'object' && el != null))) {
        return obj;
      }
      for (let i = 0; i < obj.length; i++) {
        obj[i] = legacyMdfToCodec(obj[i]);
      }
    }
    for (let [key, value] of Object.entries(obj)) {
      if (key === '_text') {
        return value;
      }
      if (typeof value === 'object') {
        if (Object.hasOwn(value, '_text')) {
          value = value._text;
        } else if (Object.hasOwn(value, 'string')) {
          value = value.string;
        }
      }
      if (key === '_attributes') {
        if (Object.hasOwn(value, 'xsi:type')) {
          obj.type = substitutions[value['xsi:type']];
        }
        delete obj[key];
        continue;
      }
      const listKeys = ['Services', 'ForwardMessages', 'ReturnMessages', 'Fields'];
      if (listKeys.includes(key)) {
        let subKey = key.includes('Message') ? 'Message' : key.slice(0, -1);
        const newKey = key in substitutions ? substitutions[key] : camelCase(key);
        obj[newKey] = [];
        if (Array.isArray(value[subKey])) {
          for (let x of value[subKey]) {
            obj[newKey].push(legacyMdfToCodec(x));
          }
        } else {
          if (typeof value[subKey] != 'undefined') {
            obj[newKey].push(legacyMdfToCodec(value[subKey]));
          }
        }
        delete obj[key];
      } else {
        if (typeof value === 'object' && value !== null) {
          value = legacyMdfToCodec(value);
        } else if (value in substitutions) {
          value = substitutions[value];
        }
        let newKey;
        if (Object.hasOwn(substitutions, key)) {
          newKey = substitutions[key];
        } else {
          newKey = camelCase(key);
        }
        if (newKey != key) {
          const intKeys = ['codecServiceId', 'codecMessageId', 'size'];
          const boolKeys = ['optional', 'fixed'];
          if (intKeys.includes(newKey)) {
            value = parseInt(value);
          } else if (boolKeys.includes(newKey)) {
            value = (value.toLowerCase() === 'true');
          }
          obj[newKey] = value;
          delete obj[key];
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
  return obj;
}

/**
 * Imports and basic sanity on the specified `NimCodec` key.
 * Accepts valid `NimCodec`, string representation in XML or JSON, or the path
 * to a valid XML(.idpmsg) or JSON file.
 * @param {Codec|string} codec Codec object, string or file path
 * @returns {Codec} valid Codec object
 * @throws If unable to parse or validate the codec
 */
function importCodec(codec) {
  if (typeof codec === 'string') {
    if (fs.existsSync(codec)) {
      try {
        codec = fs.readFileSync(codec).toString();
      } catch (err) {
        throw new Error(`Unable to read file ${codec} (${err})`);
      }
    }
    if (codec.startsWith('<')) {
      try {
        codec = legacyMdfToCodec(JSON.parse(
            xml2json(codec, {compact: true, spaces: 0})));
      } catch (err) {
        throw new Error(`Unable to parse XML codec (${err})`);
      }
    } else if (codec.startsWith('{')) {
      try {
        codec = JSON.parse(codec);
      } catch (err) {
        throw new Error(`Unable to parse JSON codec (${err})`);
      }
    } else {
      throw new Error('Invalid codec must be JSON or XML');
    }
  }
  if (Object.hasOwn(codec, 'messageDefinition')) {
    codec = codec.messageDefinition;
  }
  if (!Object.hasOwn(codec, 'services') || !Array.isArray(codec.services)) {
    throw new Error('Invalid codec');
  }
  return codec;
}

/**
 * Export to NIM codec key file format
 * @param {NimCodec} codec 
 * @param {String} filepath 
 */
function exportJson(codec, filepath) {
  const wrapped = { messageDefinition: codec };
  fs.writeFileSync(filepath, JSON.stringify(wrapped));
}

module.exports = { importCodec, exportJson };