const chai = require('chai');
chai.config.includeStack = false;
const expect = chai.expect;
const bitwise = require('bitwise');

const { isInt, int2bits, extractBits, appendBits, appendBytes } = require('../lib/bitman');

describe('#/bitman/isInt()', () => {
  
  it('should return true for valid range of integer', () => {
    const testCases = [-1, 2**64-1, -(2**64/2)];
    for (const tc of testCases) {
      expect(isInt(tc)).to.equal(true);
    }
  });

  it('should return true for numerical string when allowString is set', () => {
    expect(isInt('-1', true)).to.equal(true);
  });

  it('should return false for numerical string by default', () => {
    expect(isInt('-1')).to.equal(false);
  });

});

describe('#bitman/int2bits()', () => {

  it('-1 should be all 1s', () => {
    const testVal = -1;
    const bitLen = 4;
    const bits = int2bits(testVal, bitLen);
    expect(bits.length).to.equal(bitLen);
    const buf = bitwise.buffer.create(bits);
    expect(bitwise.buffer.readInt(buf, 0, bits.length)).to.equal(testVal);
  });

  it('should be 42 bits', () =>  {
    const bits = int2bits(1, 42);
    expect(bits.length).to.equal(42);
  });

});

describe('#bitman/extractBits()', () => {

  it('should extract 4 bits from start of 2nd byte as unsigned int', () => {
    let buffer = Buffer.from('DEAF', 'hex');
    const uint = extractBits(buffer, 8, 4);
    expect(uint).to.equal(0xA);
  });

  it('should extract 8 bits as a byte', () => {
    let inBuffer = Buffer.from('DEAF', 'hex');
    let outBuffer = extractBits(inBuffer, 8, 8, true);
    expect(Buffer.isBuffer(outBuffer)).equal(true);
    expect(outBuffer).to.have.length(1);
    expect(outBuffer[0]).to.equal(0xAF);
    expect(inBuffer.toString('hex').toUpperCase()).to.equal('DEAF');
  });

  it('should extract 3 bits at offset 3 as a byte', () => {
    let buffer = Buffer.from('DEAF', 'hex');
    let offset = 3;
    let bits = 3;
    const outBuf = extractBits(buffer, offset, bits, true);
    expect(Buffer.isBuffer(outBuf)).equal(true);
    expect(outBuf).to.have.length(Math.ceil(bits / 8));
    expect(outBuf.toString('hex').toUpperCase()).to.equal('E0');
  });

});

describe('#bitman/appendBits()', () => {

  it('should append 4 bits at middle of the last byte', () => {
    let buffer = Buffer.from('DEA0', 'hex');
    let offset = 12;
    ({ buffer, offset } = appendBits([1,1,1,1], buffer, offset));
    expect(Buffer.isBuffer(buffer)).equal(true);
    expect(buffer).to.have.length(2);
    expect(buffer.toString('hex').toUpperCase()).to.equal('DEAF');
    expect(offset).to.equal(16);
  });

  it('should append 4 bits extending the buffer', () => {
    let buffer = Buffer.from('DE', 'hex');
    let bits = [1,0,1,0,1];
    let offset = 8;
    ({ buffer, offset } = appendBits(bits, buffer, offset));
    expect(buffer).to.have.length(2);
    expect(buffer.toString('hex').toUpperCase()).to.equal('DEA8');
    expect(offset).to.equal(8 + bits.length);
  });

});

describe('#bitman/appendBytes()', () => {

  it('should append a byte extending the buffer', () => {
    let buffer = Buffer.from('DE', 'hex');
    let bytes = Buffer.from('AF', 'hex');
    let offset = 8;
    ({ buffer, offset } = appendBytes(bytes, buffer, offset));
    expect(buffer).to.have.length(2);
    expect(buffer.toString('hex').toUpperCase()).to.equal('DEAF');
    expect(offset).to.equal(16);
  });

  it('should append a byte from the middle of the input buffer', () => {
    let buffer = Buffer.from('D0', 'hex');
    let bytes = Buffer.from('EA', 'hex');
    let offset = 4;
    ({ buffer, offset } = appendBytes(bytes, buffer, offset));
    expect(buffer).to.have.length(2);
    expect(buffer.toString('hex').toUpperCase()).to.equal('DEA0');
    expect(offset).to.equal(12);
  });

});