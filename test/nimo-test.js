const chai = require('chai');
chai.config.includeStack = false;
const expect = chai.expect;
const should = chai.should();
const rewire = require('rewire');
const bitwise = require('bitwise');

// const field = rewire('../lib/codecs/nimo/field/common.js');
// const decodeField = field.__get__('decodeField');
// const encodeField = field.__get__('encodeField');
const { decodeField, encodeField, decodeFieldLength, encodeFieldLength } = require('../lib/codecs/nimo/field/common');
const { importCodec } = require('../lib/codecs/nimo/codeckey');
// const messageCodec = require('../lib/codecs/nimo/monolith').testExports;
// const { decodeMessage, encodeMessage } = require('../lib/messageCodec');
const { decodeMessage, encodeMessage } = require('../lib/codecs/nimo/message');

const idpmsgPath = './test/codecs/idpmodem.idpmsg';
const modemCodecPath = './test/codecs/idpmodem.json';

describe('#importCodec()', function() {
  const serviceKeys = ['serviceKey', 'name'];
  const messageKeys = ['messageKey', 'name', 'fields'];
  const fieldKeys = ['name', 'type'];

  it('should import idpmsg (xml)', function() {
    const converted = importCodec(idpmsgPath);
    expect(converted).to.be.an('Object').with.key('services');
    for (const s of converted.services) {
      s.should.include.all.keys(serviceKeys);
      if (s.mobileOriginatedMessages) {
        for (const m of s.mobileOriginatedMessages) {
          m.should.include.all.keys(messageKeys);
          for (const f of m.fields) {
            f.should.include.all.keys(fieldKeys);
          }
        }
      }
    }
  });

  it('should import json', function() {
    const imported = importCodec(modemCodecPath);
    expect(imported).to.be.an('Object').with.key('services');
    for (const s of imported.services) {
      s.should.include.all.keys(serviceKeys);
      if (s.mobileOriginatedMessages) {
        for (const m of s.mobileOriginatedMessages) {
          m.should.include.all.keys(messageKeys);
          for (const f of m.fields) {
            f.should.include.all.keys(fieldKeys);
          }
        }
      }
    }
  });

});

describe('#encodeFieldLength()', function() {
  // const encodeFieldLength = field.__get__('encodeFieldLength');
  let buffer = Buffer.from([0]);
  let offset = 0;
  
  it('should encode 8 bits', function() {
    const size = 4;
    buffer = Buffer.from([0]);
    offset = 0;
    ({buffer, offset} = encodeFieldLength(size, buffer, offset));
    expect(buffer.length).to.equal(1);
    expect(bitwise.buffer.readUInt(buffer, 1, 7)).to.equal(size);
  });

  it('should encode 16 bits with high bit set', function() {
    const size = 128;
    buffer = Buffer.from([0]);
    offset = 0;
    ({buffer, offset} = encodeFieldLength(size, buffer, offset));
    expect(buffer.length).to.equal(2);
    expect(bitwise.buffer.readUInt(buffer, 1, 15)).to.equal(size);
    expect(bitwise.buffer.read(buffer, 0, 1)[0]).to.equal(1);
  });
});

describe('#Boolean Field', function() {
  const testField = {
    name: "boolTest",
    type: "bool",
    // optional: false,
  };
  let buffer = Buffer.from([0]);
  let offset = 0;
  
  it('should encode a boolean field', function() {
    const testValues = [true, false];
    const startBufLen = buffer.length;
    for (const testVal of testValues) {
      let startOff = offset;
      ({buffer, offset} = encodeField(testField, testVal, buffer, offset));
      expect(bitwise.buffer.readUInt(buffer, startOff, 1)).to.equal(+ testVal);
      expect(offset).to.equal(startOff + 1);
    }
  });

  it('should decode a boolean field', function() {
    buffer = Buffer.from([128]);
    offset = 0;
    let startOff = offset;
    let decoded;
    ({decoded, offset} = decodeField(testField, buffer, offset));
    expect(decoded).to.be.an('Object');
    expect(decoded.value).to.equal(true);
    expect(offset).to.equal(startOff + 1);
  });

});

describe('#Enum Field', function() {
  const testField = {
    name: "testEnum",
    type: "enumField",
    size: 2,
    items: ['ONE', 'TWO', 'THREE'],
  };
  let buffer = Buffer.from([0]);
  let offset = 0;

  it('should encode an enumField', function () {
    const testVal = 'TWO';
    const startBufLen = buffer.length;
    const startOff = offset;
    ({buffer, offset} = encodeField(testField, testVal, buffer, offset));
    expect(bitwise.buffer.readUInt(buffer, startOff, testField.size))
        .to.equal(testField.items.indexOf(testVal));
    expect(offset).to.equal(startOff + testField.size);
  });

  it('should decode an enumField', function () {
    buffer = Buffer.from([64]);
    offset = 0;
    let startOff = offset;
    let decoded;
    ({decoded, offset} = decodeField(testField, buffer, offset));
    expect(decoded).to.be.an('Object');
    expect(decoded.value).to.equal(testField.items[1]);
    expect(offset).to.equal(startOff + testField.size);
  });
  
});

describe('#Int Field', function () {
  const testField = {
    name: "testInt",
    type: "intField",
    size: 4,
  };
  let buffer = Buffer.from([0]);
  let offset = 0;

  it('should encode negative numbers', function () {
    let startOff;
    const testVals = [-1, -5];
    for (const testVal of testVals) {
      startOff = offset;
      ({buffer, offset} = encodeField(testField, testVal, buffer, offset));
      expect(bitwise.buffer.readInt(buffer, startOff, testField.size)).to.equal(testVal);
    }
  });

  it('should error if the number is too big for size', function() {
    let startOff;
    const testVals = [-(2**testField.size / 2)-1, 2**testField.size];
    for (const testVal of testVals) {
      startOff = offset;
      expect(function() { encodeField(testField, testVal, buffer, offset) })
          .to.throw('Invalid signed integer value for size');
    }
  });

  it('should decode a negative number', function() {
    const testVal = -5;
    buffer = Buffer.from([testVal << (8 - testField.size)]);
    offset = 0;
    ({decoded,offset} = decodeField(testField, buffer, offset));
    expect(decoded.value).is.equal(testVal);
  });

});

describe('#Uint Field', function () {
  const testField = {
    name: "testUint",
    type: "uintField",
    size: 4,
  };
  let buffer = Buffer.from([0]);
  let offset = 0;

  it('should encode positive numbers', function () {
    let startOff;
    const testVals = [1, 2**testField.size - 1];
    for (const testVal of testVals) {
      startOff = offset;
      ({buffer, offset} = encodeField(testField, testVal, buffer, offset));
      expect(bitwise.buffer.readUInt(buffer, startOff, testField.size))
          .to.equal(testVal);
    }
  });

  it('should error if the number is negative or too big for size', function() {
    let startOff;
    const testVals = [-1, 2**testField.size];
    for (const testVal of testVals) {
      startOff = offset;
      expect(function() { encodeField(testField, testVal, buffer, offset) })
          .to.throw('Invalid unsigned integer value for size');
    }
  });

  it('should decode an unsigned integer', function() {
    const testVal = 1;
    buffer = Buffer.from([testVal << (8 - testField.size)]);
    offset = 0;
    ({decoded,offset} = decodeField(testField, buffer, offset));
    expect(decoded.value).to.equal(testVal);
  });

});

describe('#String Field', function() {
  const testField = {
    name: "variableString",
    type: "stringField",
    size: 32,
  };
  let buffer = Buffer.from([0]);
  let offset = 0;
  
  it('should encode a basic string', function() {
    buffer = Buffer.from([0]);
    offset = 0;
    const startOff = offset;
    const testVal = 'Test string';
    const lBytes = testVal.length < 128 ? 1 : 2;
    ({buffer, offset} = encodeField(testField, testVal, buffer, offset));
    expect(buffer.length).to.equal(lBytes + testVal.length);
    expect(buffer.toString('utf8', lBytes)).to.equal(testVal);
    expect(offset).to.equal(startOff + (lBytes + testVal.length) * 8);
  });

  it('should pad a fixed length string', function() {
    buffer = Buffer.from([0]);
    offset = 0;
    testField.fixed = true;
    const startOff = offset;
    const testVal = 'Test string';
    const lBytes = testField.size < 128 ? 1 : 2;
    ({buffer, offset} = encodeField(testField, testVal, buffer, offset));
    expect(buffer.length).to.equal(lBytes + testField.size);
    expect(buffer.toString('utf8', lBytes).slice(0, testVal.length)).to.equal(testVal);
  });

  it('should append a string a non-byte boundary', function() {
    buffer = Buffer.from([0]);
    offset = 0;
    const startOff = 3;
    const testVal = 'Test string';
    const lBytes = testVal.length < 128 ? 1 : 2;
    ({buffer, offset} = encodeField(testField, testVal, buffer, startOff));
    expect(buffer.length).to.equal(lBytes + testVal.length + 1);
    const eBits = bitwise.buffer.read(buffer, startOff + lBytes * 8, testVal.length * 8);
    expect(bitwise.buffer.create(eBits).toString()).to.equal(testVal);
  });

  it('should decode a string field', function() {
    const testStr = 'Test';
    const te = new TextEncoder();
    const enc = te.encode(testStr);
    buffer = Buffer.concat([Buffer.from([enc.length]),Buffer.from(enc)]);
    offset = 0;
    ({decoded, offset} = decodeField(testField, buffer, offset));
    expect(decoded.value).to.equal(testStr);
  });

});

describe('#Data Field', function() {
  const testField = {
    name: "variableData",
    type: "dataField",
    size: 32,
  };
  let buffer = Buffer.from([0]);
  let offset = 0;
  
  it('should encode basic blob', function() {
    const startOff = offset;
    const testVal = Buffer.from([1, 2, 3, 4]);
    const lBytes = testVal.length < 128 ? 1 : 2;
    ({buffer, offset} = encodeField(testField, testVal, buffer, offset));
    expect(buffer.length).to.equal(lBytes + testVal.length);
    expect(Buffer.compare(buffer.slice(lBytes, lBytes + testVal.length), testVal)).to.equal(0);
    expect(offset).to.equal(startOff + (lBytes + testVal.length) * 8);
  });

  it('should pad a fixed length blob', function() {
    buffer = Buffer.from([0]);
    offset = 0;
    testField.fixed = true;
    const startOff = offset;
    const testVal = Buffer.from([1, 2, 3, 4]);
    const lBytes = testField.size < 128 ? 1 : 2;
    ({buffer, offset} = encodeField(testField, testVal, buffer, offset));
    expect(buffer.length).to.equal(lBytes + testField.size);
    expect(Buffer.compare(buffer.slice(lBytes, lBytes + testVal.length), testVal)).to.equal(0);
  });

  it('should append data on a non-byte boundary', function() {
    buffer = Buffer.from([0]);
    offset = 0;
    const startOff = 3;
    const testVal = Buffer.from([1, 2, 3, 4]);
    const lBytes = testVal.length < 128 ? 1 : 2;
    ({buffer, offset} = encodeField(testField, testVal, buffer, startOff));
    expect(buffer.length).to.equal(lBytes + testVal.length + 1);
    const eBits = bitwise.buffer.read(buffer, startOff + lBytes * 8, testVal.length * 8);
    expect(Buffer.compare(bitwise.buffer.create(eBits), testVal)).to.equal(0);
  });

  it('should decode a data field', function() {
    const testVal = Buffer.from([1,2,3,4]);
    buffer = Buffer.concat([Buffer.from([testVal.length]), testVal]);
    offset = 0;
    ({decoded,offset} = decodeField(testField, buffer, offset));
    expect(Buffer.compare(decoded.value, testVal)).to.equal(0);
  });

});

describe('#Array Field', function() {
  const testCase1d = {
    fieldDef: {
      name: 'array1d',
      type: 'array',
      size: 32,
      fields: [
        {
          name: 'temperature',
          type: 'int',
          size: 9,
        }
      ],
    },
    encoded: [2, 253, 131, 64],
    decoded: {
      name: 'array1d',
      value: [{temperature: -5}, {temperature: 13},],
    },
  };
  const testCase2d = {
    fieldDef: {
      name: 'array2d',
      type: 'array',
      size: 128,
      fields: [
        {
          name: 'parameterName',
          type: 'string',
          size: 16
        },
        {
          name: 'parameterValue',
          type: 'uint',
          size: 32
        }
      ],
    },
    encoded: [1, 9, 116, 101, 115, 116, 80, 97, 114, 97, 109, 0, 0, 0, 1],
    decoded: {
      name: 'testArray',
      type: 'array',
      value: [{parameterName: 'testParam', parameterValue: 1},],
    },
  };
  const testCases = [testCase1d, testCase2d,];
  const testField = {
    name: 'testArray',
    type: 'array',
    size: 128,
    fields: [
      {
        name: 'parameterName',
        type: 'string',
        size: 16
      },
      {
        name: 'parameterValue',
        type: 'uint',
        size: 32
      }
    ],
  };
  let buffer = Buffer.from([0]);
  let offset = 0;

  it('should encode an array', function() {
    for (const tc of testCases) {
      const { fieldDef, encoded, decoded } = tc;
      buffer = Buffer.from([0]);
      offset = 0;
      ({buffer, offset} = encodeField(fieldDef, decoded.value, buffer, offset));
      expect(Buffer.compare(buffer, Buffer.from(encoded))).to.equal(0);
    }
  });

  it('should decode an array', function() {
    for (const tc of testCases) {
      const { fieldDef, encoded, decoded: expected } = tc;
      buffer = Buffer.from(encoded);
      offset = 0;
      let decoded;
      ({decoded, offset} = decodeField(fieldDef, buffer, offset));
      decoded.value.forEach((value, i) => {
        for (const [k, v] of Object.entries(value)) {
          expect(v).to.equal(expected.value[i][k]);
        }
      });
    }
  });

});

describe('#Bitkeylist Field', function() {
  const testCase1 = {
    fieldDef: {
      name: 'testBitkey',
      type: 'bitkeylist',
      size: 8,
      items: ['bit0', 'bit1', 'bit2'],
      fields: [
        {
          name: 'kpi1',
          type: 'uint',
          size: 4
        },
        {
          name: 'kpi2',
          type: 'uint',
          size: 4
        }
      ],
    },
    encoded: [5, 18, 2],
    decoded: {
      name: 'testBitKey',
      type: 'bitkeylist',
      value: [
        { "bit0": {"kpi1": 1, "kpi2": 2}},
        { "bit2": {"kpi1": 0, "kpi2": 2}},
      ],
    },
  };
  const testCases = [testCase1,];
  it('should encode a bitkeylist', function() {
    for (const tc of testCases) {
      const { fieldDef, encoded, decoded } = tc;
      let buffer = Buffer.from([0]);
      let offset = 0;
      ({buffer,offset} = encodeField(fieldDef, decoded.value, buffer, offset));
      expect(Buffer.compare(buffer, Buffer.from(encoded))).to.equal(0);
    }
  });
  
  it('should decode a bitkeylist', function() {
    for (const tc of testCases) {
      const { fieldDef, encoded, decoded: expected } = tc;
      let buffer = Buffer.from(encoded);
      let offset = 0;
      let decoded;
      ({decoded, offset} = decodeField(fieldDef, buffer, offset));
      expect(decoded.value).to.be.an('Array');
      decoded.value.forEach((row, i) => {
        const expBitkey = Object.keys(expected.value[i])[0];
        const expEntry = Object.values(expected.value[i])[0];
        const actBitkey = Object.keys(row)[0];
        const actEntry = Object.values(row)[0];
        expect(actBitkey).to.equal(expBitkey);
        for (const [k, v] of Object.entries(actEntry)) {
          expect(v).to.equal(expEntry[k]);
        }
      });
    }
  });

});

const tcLocation = {
  codecKey: modemCodecPath,
  isMo: true,
  encoded: [0, 72, 1, 41, 117, 182, 221, 71, 130, 0, 90, 1, 99, 252, 107],
  decoded: {
    name: 'location',
    serviceKey: 0,
    messageKey: 72,
    fields: {
      fixStatus: 'Valid',
      latitude: 2717110,
      longitude: -4550908,
      altitude: 90,
      speed: 1,
      heading: 99,
      dayOfMonth: 31,
      minuteOfDay: 1131,
    },
  },
};
const tcTxMetricsData = {
  codecKey: modemCodecPath,
  isMo: true,
  idpmsgFile: '',
  encoded: [0, 100, 6, 3,
            0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0,
            0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0],
  decoded: {
    name: 'txMetricsReport',
    serviceKey: 0,
    messageKey: 100,
    fields: {
      period: 'LastFullDay',
      txMetrics: [
        { 'ack': {'packetsTotal': 3, 'packetsSuccess': 3, 'packetsFailed': 0} },
        { '0533': {'packetsTotal': 3, 'packetsSuccess': 3, 'packetsFailed': 0} },
      ],
    },
  },
};
const testMessages = [
  // tcLocation,
  tcTxMetricsData,
];

describe('#Message', function () {
  
  const messageKeys = ['name', 'serviceKey', 'messageKey', 'fields'];

  context('with idpmsg XML file', function() {
    it('should decode the test messages', function() {
      for (const tc of testMessages) {
        const { encoded, decoded: expected, isMo } = tc;
        const decoded = decodeMessage(encoded, idpmsgPath, isMo);
        expect(decoded).to.be.an('Object').with.keys(messageKeys);
        for (const [key, value] of Object.entries(decoded.fields)) {
          if (!Array.isArray(value)) {
            expect(expected.fields[key]).to.equal(value);
          } else {
            const expArray = expected.fields[key];
            value.forEach((row, i) => {
              for (const [k, v] of Object.entries(Object.values(row)[0])) {
                const expObj = Object.values(expArray[i])[0];
                expect(expObj[k]).to.equal(v);
              }
            });
          }
        }
      }
    });
  });

  context('with JSON file', function() {
    it('should decode the test messages', function() {
      for (const tc of testMessages) {
        const { codecKey, encoded, decoded: expected, isMo } = tc;
        const decoded = decodeMessage(encoded, codecKey, isMo);
        expect(decoded).to.be.an('Object').with.keys(messageKeys);
        for (const [key, value] of Object.entries(decoded.fields)) {
          if (!Array.isArray(value)) {
            expect(expected.fields[key]).to.equal(value);
          } else {
            const expArray = expected.fields[key];
            value.forEach((row, i) => {
              for (const [k, v] of Object.entries(Object.values(row)[0])) {
                const expObj = Object.values(expArray[i])[0];
                expect(expObj[k]).to.equal(v);
              }
            });
          }
        }
      }
    });

    it('should encode the test messages', function() {
      for (const tc of testMessages) {
        const { codecKey, encoded: expected, decoded, isMo } = tc;
        const encoded = encodeMessage(decoded, codecKey, isMo);
        expect(Buffer.compare(encoded, Buffer.from(expected))).to.equal(0);
      }
    });

  });

  context('with XML string', function() {});

  context('with JSON string', function() {});

  context('with Codec object', function() {});

});
