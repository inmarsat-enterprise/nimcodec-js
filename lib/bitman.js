/**
 * Helper functions to manipulate bits within a buffer
 * @namespace bitman
 */

const bitwise = require('bitwise');

/**
 * Get the absolute value of a BigInt
 * @param {bigint} n The number to get absolute value of
 * @returns 
 */
function absBigInt_(n) {
  return n < 0n ? -n : n;
}

/**
 * Get the base 2 log of a BigInt
 * @param {bigint} n The number to get base 2 log of
 * @returns 
 */
function log2BigInt_(n) {
  if (n <= 0n)
    throw new RangeError('Input must be positive BigInt');
  let log = 0;
  while (n > 1n) {
    n >>= 1n;
    log++;
  }
  return log;
}

/**
 * Check if a value is an integer
 * @param {number|string} candidate 
 * @param {boolean} allowString 
 * @returns `true` if the value represents an integer
 */
function isInt(candidate, allowString = false) {
  if (allowString)
    candidate = parseFloat(candidate);
  if (typeof candidate !== 'number' && typeof candidate !== 'bigint') {
    console.error(`Invalid integer`);
    return false;
  }
  if (typeof candidate === 'number') {
    if (Math.log2(Math.abs(candidate)) > 32) {
      console.error(`Number bigger than int32 must use bigint`);
      return false;
    }
    return (candidate % 1) === 0;
  }
  return (candidate % 1n) === 0n;
}

/**
 * Converts a number to a bitwise-compatible Array of bits
 * @function int2bits
 * @memberof bitman
 * @param {number} int The number to convert
 * @param {number} nBits The number of bits to use
 * @returns {Array<0|1>} An array of bit values
 */
function int2bits(int, nBits) {
  if (!isInt(int))
    throw new Error('Invalid integer');
  if (typeof nBits !== 'number' || nBits < 1 || nBits > 64)
    throw new Error('Invalid number of bits must be 1..64');
  let bitsRequired;
  if (typeof int === 'number') {
    bitsRequired = Math.ceil(Math.log2(Math.abs(int))) || 1;
    if (int < 0)
      bitsRequired++;
  } else {
    bitsRequired = log2BigInt_(absBigInt_(int)) || 1;
    if (int < 0n)
      bitsRequired++;
  }
  if (nBits < bitsRequired)
    throw new Error('Insufficient bits to encapsulate value');
  let bitArray = [];
  let bufSize = nBits <= 32 ? 4 : 8;
  let buf = Buffer.allocUnsafe(bufSize);
  if (int < 0) {
    if (nBits <= 32) {
      buf.writeInt32BE(int);
    } else {
      buf.writeBigInt64BE(BigInt(int));
    }
  } else {
    if (nBits <= 32) {
      buf.writeUInt32BE(int);
    } else {
      buf.writeBigUInt64BE(BigInt(int));
    }
  }
  for (const b of buf) {
    bitArray = bitArray.concat(bitwise.byte.read(b));
  }
  return bitArray.slice(bitArray.length - nBits);
}

/**
 * Read a subset of bits from a data Buffer
 * 
 * If `asBuffer` is `true` the bits will be returned in a Buffer
 * @function extractBits
 * @memberof bitman
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The bit offset to start reading from
 * @param {number} length The number of bits to read
 * @param {boolean} [asBuffer] If `true` return a Buffer instead of number
 * @param {boolean} [signed] If `true` check for MSB sign bit to negate
 * @returns A number or bitwise.buffer of the bits read
 */
function extractBits(buffer, offset, length, asBuffer = false, signed = false) {
  if (length > 64)
    throw new Error('Number of bits exceeds int64');
  if (!Buffer.isBuffer(buffer))
    throw new Error('Invalid data buffer');
  if ((offset + length) > 8 * buffer.length)
    throw new Error('Invalid bit range');
  if (typeof asBuffer != 'boolean')
    asBuffer = false;
  if (asBuffer === true)
    return bitwise.buffer.create(bitwise.buffer.read(buffer, offset, length));
  if (length <= 32) {
    if (signed)
      return bitwise.buffer.readInt(buffer, offset, length);
    return bitwise.buffer.readUInt(buffer, offset, length);
  }
  // Handle bigInt
  let bigIntBits = [];
  let byteOffset = Math.floor(offset / 8);
  let bitIndex = offset % 8;
  for (let i = 0; i < length; i++) {
    let byte = buffer[byteOffset];
    let bit = (byte >> (7 - bitIndex)) & 1;
    bigIntBits.push(bit);
    bitIndex++;
    if (bitIndex === 8) {
      bitIndex = 0;
      byteOffset++;
    }
  }
  if (length < 64) {
    const fill = (signed && bigIntBits[0] === 1) ? 1 : 0;
    const pad = Array(64 - bigIntBits.length).fill(fill);
    bigIntBits = pad.concat(bigIntBits);
  }
  const bigIntBuf = bitwise.buffer.create(bigIntBits);
  if (signed)
    return bigIntBuf.readBigInt64BE();
  return bigIntBuf.readBigUInt64BE();
}

/**
 * Appends bits to a buffer at an offset.
 * Extends the buffer if required.
 * @function appendBits
 * @memberof bitman
 * @param {Array<0|1>} bits The bitwise `bits` to append
 * @param {Buffer} buffer The buffer to append to
 * @param {number} offset The bit offset to append at
 * @returns Object with appended `buffer` and new bit `offset`
 */
function appendBits(bits, buffer, offset) {
  if (offset + bits.length > 8 * buffer.length) {
    const extraBytes = Math.ceil((offset + bits.length - 8 * buffer.length) / 8);
    for (let i = 0; i < extraBytes; i++) {
      const x = bitwise.buffer.create([0,0,0,0,0,0,0,0]);
      buffer = Buffer.concat([buffer, x]);
    }
  }
  bitwise.buffer.modify(buffer, bits, offset);
  return { buffer: buffer, offset: offset + bits.length };
}

/**
 * Appends bytes to a buffer at a bit offset, extending the buffer if required.
 * @function appendBytes
 * @memberof bitman
 * @param {Buffer} bytes The bytes to append
 * @param {Buffer} buffer The buffer to append to
 * @param {number} offset The bit offset to append at
 * @returns Object with appended `buffer` and new bit `offset`
 */
function appendBytes(bytes, buffer, offset) {
  if (!Buffer.isBuffer(bytes)) throw new Error('Invalid buffer');
  if (offset % 8 != 0) {
    let bits = [];
    for (const b of bytes.values()) {
      bits = bits.concat(bitwise.byte.read(b));
    }
    ({buffer, offset} = appendBits(bits, buffer, offset));
  } else {
    buffer = Buffer.concat([buffer, bytes]);
    offset += bytes.length * 8;
  }
  return { buffer: buffer, offset: offset };
}

module.exports = {
  appendBits,
  appendBytes,
  int2bits,
  extractBits,
  isInt,
};