/**
 * Codec functions for Non-IP Modems based on ORBCOMM protocols
 * @namespace cbc
 */
const mathjs = require('mathjs');
const { isInt } = require('../../bitman');
const { FieldType, MessageDirection } = require('./types');
const { decodeMessage, encodeMessage } = require('./message');

/**
 * Check if a variable is a valid object (non-null, non-array)
 * @param {*} candidate 
 * @returns 
 */
function isObject(candidate) {
  if (typeof candidate !== 'object' ||
      candidate === null ||
      Array.isArray(candidate))
    return false;
  return true;
}

/**
 * Check if a variable is a valid non-empty string
 * @param {*} candidate 
 * @returns 
 */
function isValidString_(candidate) {
  if (typeof candidate !== 'string' || candidate.trim().length === 0) {
    console.error(`Invalid string`);
    return false;
  }
  return true;
}

/**
 * Check if a string conforms to semantic versioning e.g. 1.2.3
 * @param {*} candidate 
 * @returns 
 */
function isValidSemVer_(candidate) {
  if (!isValidString_(candidate))
    return false;
  let result = true;
  if (candidate.includes('.')) {
    let parts = candidate.split('.');
    for (const part of parts) {
      if (!isInt(part, true))
        result = false;
    }
  } else {
    if (!isInt(candidate, true))
      result = false;
  }
  if (!result)
    console.error(`Invalid semver`);
  return result;
}

/**
 * Check if an object meets the Field structural definition
 * @param {*} candidate 
 * @returns 
 */
function isValidFieldDef_(candidate) {
  if (!isObject(candidate))
    return false;

  const mFieldKeys = ['name', 'type'];
  const oFieldKeys = ['description', 'optional', 'fixed', 'calc'];
  const cFieldKeys = {
    // bool: [],
    // float: [],
    int: ['size'],
    uint: ['size'],
    enum: ['size', 'enum'],
    bitmask: ['size', 'enum'],
    string: ['size'],
    data: ['size'],
    array: ['size', 'fields'],
    struct: ['fields'],
    bitmaskarray: ['size', 'enum', 'fields'],
  };

  for (const key of mFieldKeys) {
    if (!Object.hasOwn(candidate, key)) {
      console.error(`Missing key: ${key}`);
      return false;
    }
    const v = candidate[key];
    if (key === 'name') {
      if (!isValidString_(v))
        return false;
    } else if (key === 'type') {
      if (!Object.values(FieldType).includes(v)) {
        console.error(`Invalid type: ${v}`);
        return false;
      }
      if (Object.keys(cFieldKeys).includes(v)) {
        const mKeys = cFieldKeys[v];
        for (const fKey of mKeys) {
          if (!Object.hasOwn(candidate, fKey))
            return false;
          const fv = candidate[fKey];
          if (fKey === 'size') {
            if (!isInt(fv) || fv <= 0)
              return false;
          } else if (fKey === 'enum') {
            if (!isObject(fv))
              return false;
            if (!candidate.size)
              return false;
            let maxEntries = candidate.size;
            if (candidate.type === 'enum') {
              maxEntries = 2**maxEntries;
            }
            if (Object.keys(fv).length > maxEntries)
              return false;
            for (const [ek, ev] of Object.entries(fv)) {
              if (!isInt(ek, true))
                return false;
              if (parseInt(ek) < 0 || parseInt(ek) >= maxEntries)
                return false;
              if (!isValidString_(ev))
                return false;
            }
            const eValues = Object.values(fv);
            const duplicates = eValues.filter((item, idx) => {
              return eValues.indexOf(item) !== idx;
            });
            if (duplicates.length > 0)
              return false;
          } else if (fKey === 'fields') {
            if (!Array.isArray(fv))
              return false;
            for (const field of fv) {
              if (!isValidFieldDef_(field))
                return false;
            }
          }
        }
      }
    }
  }
  for (const key of oFieldKeys) {
    if (Object.hasOwn(candidate, key)) {
      if (key === 'description') {
        if (!isValidString_(candidate[key]))
          return false;
      } else if (['optional', 'fixed'].includes(key)) {
        if (typeof candidate[key] !== 'boolean')
          return false;
        if (key === 'fixed' &&
            !['string', 'data', 'array'].includes(candidate.type))
          return false;
      } else if (['decalc', 'encalc'].includes(key)) {
        if (!isValidString_(candidate[key]) ||
            !candidate[key].includes('v') ||
            !['int', 'uint'].includes(candidate.type))
          return false;
        try {
          let expr = candidate[key].replaceAll('v', 1);
          if (isNaN(mathjs.evaluate(expr)))
            return false;
        } catch {
          return false;
        }
      }
    }
  }
  return true;
}

/**
 * Check if an object meets the Message structural definition
 * @param {*} candidate 
 * @returns 
 */
function isValidMessageDef_(candidate) {
  if (!isObject(candidate))
    return false;

  const mMessageKeys = ['direction', 'name', 'messageKey', 'fields'];
  const oMessageKeys = ['description'];
  const cMessageKeys = ['coapVersion', 'coapType', 'coapTokenLength',
      'coapCodeClass', 'coapCodeMethod' ];

  for (const key of mMessageKeys) {
    if (!Object.hasOwn(candidate, key))
      return false;
    const v = candidate[key];
    if (key === 'name') {
      if (!isValidString_(v))
        return false;
    } else if (key === 'direction') {
      if (![MessageDirection.MO, MessageDirection.MT].includes(v))
        return false;
    } else if (key === 'messageKey') {
      if (typeof v !== 'number' || v < 0 || v > 65535)
        return false;
      // if (v < 4096)
      //   console.warn(`Message not compatible with CoAP`);
    } else if (key === 'fields') {
      if (!Array.isArray(v) || v.length === 0)
        return false;
      for (const field of v) {
        if (!isValidFieldDef_(field))
          return false;
      }
    }
  }
  for (const key of oMessageKeys) {
    if (Object.hasOwn(candidate, key)) {
      const v = candidate[key];
      if (key === 'description') {
        if (!isValidString_(v))
          return false;
      }
    }
  }
  if (Object.keys(candidate).filter(k => k.startsWith('coap')).length > 0) {
    for (const key of cMessageKeys) {
      if (!Object.hasOwn(candidate, key))
        return false;
      const v = candidate[key];
      if (key === 'coapVersion') {
        if (v !== 1)
          return false;
      } else if (key === 'coapType') {
        if (![0, 1, 2, 3].includes(v))
          return false;
      } else if (key === 'coapTokenLength') {
        if (typeof v !== 'number' || v < 0 || v > 8)
          return false;
      } else if (key === 'coapCodeClass') {
        if (typeof v !== 'number' || v < 0 || v > 8)
          return false;
      } else if (key === 'coapCodeMethod') {
        if (typeof v !== 'number' || v < 0 || v > 31)
          return false;
      }
    }
  }
  return true;
}

/**
 * Check if an object meets the Codec structural definition
 * @param {*} candidate 
 * @returns 
 */
function isValidCodec(candidate) {
  if (!isObject(candidate))
    return false;

  const mMetaKeys = ['application', 'messages'];
  const oMetaKeys = ['version', 'description'];

  for (const key of mMetaKeys) {
    if (!Object.hasOwn(candidate, key))
      return false;
    const v = candidate[key];
    if (key === 'application') {
      if (!isValidString_(v))
        return false;
    } else if (key === 'messages') {
      if (!Array.isArray(v) || v.length === 0)
        return false;
      for (const message of v) {
        if (!isValidMessageDef_(message))
          return false;
      }
      // check for duplicate names
      const nameCount = {};
      v.forEach(message => {
        const name = message.name;
        if (!nameCount[name])
          nameCount[name] = 0;
        nameCount[name]++;
      });
      if (Object.values(nameCount).some(e => e > 1))
        return false;
    }
  }
  for (const key of oMetaKeys) {
    if (Object.hasOwn(candidate, key)) {
      if (key === 'version') {
        if (!isValidSemVer_(candidate[key]))
          return false;
      } else if (key === 'description') {
        if (!isValidString_(candidate[key]))
          return false;
      }
    }
  }
  
  return true;
}

module.exports = {
  FieldType,
  MessageDirection,
  isValidCodec,
  decodeMessage,
  encodeMessage,
};