const bitwise = require('bitwise');

/**
 * Converts a number to a bitwise-compatible Array of bits
 * @param {number} dec The number to convert
 * @param {number} nBits The number of bits to use
 * @returns {Array<0|1>}
 */
function dec2bits(dec, nBits) {
  let arrBitwise = [];
  for (let i = 0; i < nBits; i++) {
    const bit = dec & (1 << i);
    arrBitwise.push(bit === 0 ? 0 : 1);
  }
  arrBitwise = arrBitwise.reverse();
  return arrBitwise;
}

/**
 * Read a subset of bits from a data Buffer
 * @param {Buffer} buffer The raw payload buffer
 * @param {number} offset The bit offset to start reading from
 * @param {number} length The number of bits to read
 * @param {boolean} bytes If true return a Buffer instead of number
 * @returns A number or Buffer of the bits read
 */
function extractBits(buffer, offset, length, bytes = false) {
  if (!Buffer.isBuffer(buffer)) throw new Error('Invalid data buffer');
  if ((offset + length) > 8 * buffer.length) throw new Error('Invalid bit range');
  if (typeof bytes != 'boolean') bytes = false;
  if (length < 2**32 && !bytes) {
    return bitwise.buffer.readUInt(buffer, offset, length);
  }
  return bitwise.buffer.create(bitwise.buffer.read(buffer, offset, length));
}

/**
 * Appends bits to a buffer at an offset.
 * Extends the buffer if required.
 * @param {Array<0|1>} bits The bitwise `bits` to append
 * @param {Buffer} buffer The buffer to append to
 * @param {number} offset The bit offset to append at
 * @returns 
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
 * @param {Buffer} bytes The bytes to append
 * @param {Buffer} buffer The buffer to append to
 * @param {number} offset The bit offset to append at
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
  dec2bits,
  extractBits,
};