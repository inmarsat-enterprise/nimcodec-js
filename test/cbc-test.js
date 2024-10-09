const chai = require('chai');
chai.config.includeStack = false;
const expect = chai.expect;
const rewire = require('rewire');
const bitwise = require('bitwise');
const mathjs = require('mathjs');

const { cbc } = require('../lib');
const { decodeMessage, encodeMessage, isValidCodec } = cbc;
const { decodeField, encodeField, encodeFieldLength } = require('../lib/codecs/cbc/field/common');
const codec_ = rewire('../lib/codecs/cbc/index.js');

const basicCodec = {
  application: 'Test app',
  messages: [
    {
      name: 'Test message',
      direction: 'UPLINK',
      messageKey: 1,
      fields: [
        {
          name: 'Test field',
          type: 'int',
          size: 8,
        }
      ]
    }
  ],
};

describe('#cbc/isValidCodec()', () => {

  const isValidFieldDef_ = codec_.__get__('isValidFieldDef_');

  it('should validate meta', () => {
    expect(isValidCodec(basicCodec)).to.equal(true);
    const invalid = Object.assign({}, basicCodec);
    invalid.messages = [];
    expect(isValidCodec(invalid)).to.equal(false);
  });

  it ('should validate int field', () => {
    const intField = {
      name: 'testInt',
      type: 'int',
      size: 8,
    };
    expect(isValidFieldDef_(intField)).to.equal(true);
    const mandatory = ['name', 'type', 'size'];
    for (const m of mandatory) {
      const invalid = Object.assign({}, intField);
      delete invalid[m];
      expect(isValidFieldDef_(invalid)).to.equal(false);
    }
    const invalid = Object.assign({}, intField);
    invalid.size = -1;
    expect(isValidFieldDef_(invalid)).to.equal(false);
  });

  it('should validate optional field', () => {
    const optField = {
      name: 'testOpt',
      type: 'string',
      size: 32,
      optional: true,
    };
    expect(isValidFieldDef_(optField)).to.equal(true);
    const invalid = Object.assign({}, optField);
    invalid.optional = 1;
    expect(isValidFieldDef_(invalid)).to.equal(false);
  });

  it('should validate enum field', () => {
    const enumField = {
      name: 'testEnum',
      type: 'enum',
      size: 2,
      enum: { 1: 'ONE', 2: 'TWO', 3: 'THREE' },
    };
    expect(isValidFieldDef_(enumField)).to.equal(true);
    const invalidEnums = [
      { 1: 'ONE', 2: 'ONE' },   // duplicate values
      { 'ONE': 1, 'TWO': 2 },   // non-numeric keys
      { 0: 'ZERO', 1: 'ONE', 2: 'TWO', 3: 'THREE', 4: 'FOUR'},   // too big for size
      { 5: 'FIVE' },   // numeric value exceeds size range
    ];
    const invalid = Object.assign({}, enumField);
    for (const i of invalidEnums) {
      invalid.enum = i;
      expect(isValidFieldDef_(invalid)).to.equal(false);
    }
  });

  it('should validate bitmask field', () => {
    const bitmaskField = {
      name: 'testBitmask',
      type: 'bitmask',
      size: 8,
      enum: {
        0: 'bit0',
        1: 'bit1',
        5: 'bit5',
      },
    };
    expect(isValidFieldDef_(bitmaskField)).to.equal(true);
  });

  it ('should validate array field', () => {
    const arrayField = {
      name: 'testArray',
      type: 'array',
      size: 8,
      fields: [
        {
          name: 'testSubField',
          type: 'uint',
          size: 8,
        }
      ]
    };
    expect(isValidFieldDef_(arrayField)).to.equal(true);
    const mandatory = ['fields'];
    for (const m of mandatory) {
      const invalid = Object.assign({}, arrayField);
      delete invalid[m];
      expect(isValidFieldDef_(invalid)).to.equal(false);
    }
    const multiDimArrayField = Object.assign({}, arrayField);
    multiDimArrayField.fields.push({
      name: 'testSubField2',
      type: 'string',
      size: 32,
    });
    expect(isValidFieldDef_(multiDimArrayField)).to.equal(true);
  });

});

describe('#cbc/common/encodeFieldLength()', () => {
  let buffer = Buffer.from([0]);
  let offset = 0;
  
  it('should encode 8 bits', () => {
    const size = 4;
    buffer = Buffer.from([0]);
    offset = 0;
    ({buffer, offset} = encodeFieldLength(size, buffer, offset));
    expect(buffer.length).to.equal(1);
    expect(bitwise.buffer.readUInt(buffer, 1, 7)).to.equal(size);
  });

  it('should encode 16 bits with high bit set', () => {
    const size = 128;
    buffer = Buffer.from([0]);
    offset = 0;
    ({buffer, offset} = encodeFieldLength(size, buffer, offset));
    expect(buffer.length).to.equal(2);
    expect(bitwise.buffer.readUInt(buffer, 1, 15)).to.equal(size);
    expect(bitwise.buffer.read(buffer, 0, 1)[0]).to.equal(1);
  });
});

describe('#cbc/field/bool', () => {
  const testField = {
    name: 'boolTest',
    type: 'bool',
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

describe('#cbc/field/enum', () => {
  const testField = {
    name: 'testEnum',
    type: 'enum',
    size: 2,
    enum: {1: 'ONE', 2: 'TWO', 3: 'THREE'},
  };
  let buffer = Buffer.from([0]);
  let offset = 0;

  it('should encode an enumField', () => {
    const testVal = 'TWO';
    const startBufLen = buffer.length;
    const startOff = offset;
    ({buffer, offset} = encodeField(testField, testVal, buffer, offset));
    expect(bitwise.buffer.readUInt(buffer, startOff, testField.size))
        .to.equal(2);
    expect(offset).to.equal(startOff + testField.size);
  });

  it('should decode an enumField', () => {
    buffer = Buffer.from([64]);   // 0b01000000
    offset = 0;
    let startOff = offset;
    let decoded;
    ({decoded, offset} = decodeField(testField, buffer, offset));
    expect(decoded).to.be.an('Object');
    expect(decoded.value).to.equal(testField.enum[1]);
    expect(offset).to.equal(startOff + testField.size);
  });
  
});

describe('#cbc/field/int', () => {
  const testField = {
    name: "testInt",
    type: "intField",
    size: 4,
  };
  let buffer = Buffer.from([0]);
  let offset = 0;

  it('should encode negative numbers', () => {
    let startOff;
    const testVals = [-1, -5];
    for (const testVal of testVals) {
      startOff = offset;
      ({buffer, offset} = encodeField(testField, testVal, buffer, offset));
      expect(bitwise.buffer.readInt(buffer, startOff, testField.size)).to.equal(testVal);
    }
  });

  it('should error if the number is too big for size', () => {
    let startOff;
    const testVals = [-(2**testField.size / 2)-1, 2**testField.size];
    for (const testVal of testVals) {
      startOff = offset;
      expect(function() { encodeField(testField, testVal, buffer, offset) })
          .to.throw('Invalid signed integer value for size');
    }
  });

  it('should decode a negative number', () => {
    const testVal = -5;
    buffer = Buffer.from([testVal << (8 - testField.size)]);
    let {decoded} = decodeField(testField, buffer, 0);
    expect(decoded.value).is.equal(testVal);
  });

});

describe('#cbc/field/uint', () => {
  const testField = {
    name: "testUint",
    type: "uintField",
    size: 4,
  };
  let buffer = Buffer.from([0]);
  let offset = 0;

  it('should encode positive numbers', () => {
    let startOff;
    const testVals = [1, 2**testField.size - 1];
    for (const testVal of testVals) {
      startOff = offset;
      ({buffer, offset} = encodeField(testField, testVal, buffer, offset));
      expect(bitwise.buffer.readUInt(buffer, startOff, testField.size))
          .to.equal(testVal);
    }
  });

  it('should error if the number is negative or too big for size', () => {
    let startOff;
    const testVals = [-1, 2**testField.size];
    for (const testVal of testVals) {
      startOff = offset;
      expect(function() { encodeField(testField, testVal, buffer, offset) })
          .to.throw('Invalid unsigned integer value for size');
    }
  });

  it('should decode an unsigned integer', () => {
    const testVal = 1;
    buffer = Buffer.from([testVal << (8 - testField.size)]);
    let {decoded} = decodeField(testField, buffer, 0);
    expect(decoded.value).to.equal(testVal);
  });

  it('should encode a bigint', () => {
    const testBigInt = {
      name: 'testBigInt',
      type: 'uint',
      optional: true,
      size: 50,
    };
    let testVal = 999999999999999n;
    ({buffer, offset} = encodeField(testBigInt, testVal, buffer, 0));
    expect(buffer).to.have.length(7);
    let {decoded} = decodeField(testBigInt, buffer, 0);
    expect(decoded.value).to.equal(BigInt(testVal));
  });

});

describe('#cbc/field/float', () => {
  const testFloat = {
    name: 'testFloat',
    type: 'float',
  };

  it('should encode a float', () => {
    const testVal = 1.234;
    let buffer = Buffer.from([]);
    let offset = 0;
    ({ buffer, offset } = encodeField(testFloat, testVal, buffer, offset));
    expect(buffer).to.have.length(4);
    const precision = `${testVal}`.split('.')[1].length;
    expect(mathjs.round(buffer.readFloatBE(), precision)).to.equal(testVal);
  });

  it('should decode a float from a non-byte boundary', () => {
    const testVal = 2.345;
    let buffer = Buffer.from([0]);
    ({buffer} = encodeField(testFloat, testVal, buffer, 3));
    expect(buffer).to.have.length(5);
    let { decoded } = decodeField(testFloat, buffer, 3);
    const precision = `${testVal}`.split('.')[1].length;
    expect(mathjs.round(decoded.value, precision)).to.equal(testVal);
  });

});

describe('#cbc/field/calc', () => {
  const testCalcField = {
    name: 'longitude',
    type: 'int',
    size: 25,
    encalc: 'v*60000',
    decalc: 'v/60000',
  };

  it('should calculate encode and decode of integer', () => {
    let buffer = Buffer.from([0]);
    let offset = 0;
    const testVal = -117.26501;
    ({ buffer, offset } = encodeField(testCalcField, testVal, buffer, offset));
    expect(buffer).to.have.length(Math.ceil(testCalcField.size / 8));
    let { decoded } = decodeField(testCalcField, buffer, 0);
    expect(mathjs.fix(decoded.value, 5)).to.equal(testVal);
  });

});

describe('#cbc/field/string', () => {
  const testField = {
    name: "variableString",
    type: "stringField",
    size: 32,
  };
  let buffer = Buffer.from([0]);
  let offset = 0;
  
  it('should encode a basic string', () => {
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

  it('should pad a fixed length string', () => {
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

  it('should append a string a non-byte boundary', () => {
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

  it('should decode a string field', () => {
    const testStr = 'Test';
    const te = new TextEncoder();
    const enc = te.encode(testStr);
    buffer = Buffer.concat([Buffer.from([enc.length]),Buffer.from(enc)]);
    offset = 0;
    ({decoded, offset} = decodeField(testField, buffer, offset));
    expect(decoded.value).to.equal(testStr);
  });

});

describe('#cbc/field/data', () => {
  const testField = {
    name: "variableData",
    type: "dataField",
    size: 32,
  };
  let buffer = Buffer.from([0]);
  let offset = 0;
  
  it('should encode basic blob', () => {
    const startOff = offset;
    const testVal = Buffer.from([1, 2, 3, 4]);
    const lBytes = testVal.length < 128 ? 1 : 2;
    ({buffer, offset} = encodeField(testField, testVal, buffer, offset));
    expect(buffer.length).to.equal(lBytes + testVal.length);
    expect(Buffer.compare(buffer.slice(lBytes, lBytes + testVal.length), testVal)).to.equal(0);
    expect(offset).to.equal(startOff + (lBytes + testVal.length) * 8);
  });

  it('should pad a fixed length blob', () => {
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

  it('should append data on a non-byte boundary', () => {
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

  it('should decode a data field', () => {
    const testVal = Buffer.from([1,2,3,4]);
    buffer = Buffer.concat([Buffer.from([testVal.length]), testVal]);
    offset = 0;
    ({decoded,offset} = decodeField(testField, buffer, offset));
    expect(Buffer.compare(decoded.value, testVal)).to.equal(0);
  });

});

describe('#cbc/field/array', () => {
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

  const testCases = [
    testCase1d,
    testCase2d,
  ];
  
  let buffer = Buffer.from([0]);
  let offset = 0;

  it('should encode an array', () => {
    for (const tc of testCases) {
      const { fieldDef, encoded, decoded } = tc;
      buffer = Buffer.from([0]);
      offset = 0;
      ({buffer, offset} = encodeField(fieldDef, decoded.value, buffer, offset));
      expect(Buffer.compare(buffer, Buffer.from(encoded))).to.equal(0);
    }
  });

  it('should decode an array', () => {
    for (const tc of testCases) {
      const { fieldDef, encoded, decoded: expected } = tc;
      buffer = Buffer.from(encoded);
      offset = 0;
      let decoded;
      ({decoded, offset} = decodeField(fieldDef, buffer, offset));
      decoded.value.forEach((value, i) => {
        for (const [k, v] of Object.entries(value)) {
          let expectedValue = expected.value[i][k];
          if (typeof expectedValue === 'number' && expectedValue % 1 !== 0) {
            let decPlaces = `${expectedValue}`.split('.')[1].length;
            expect(mathjs.fix(v, decPlaces)).to.equal(expectedValue);
          } else {
            expect(v).to.equal(expectedValue);
          }
        }
      });
    }
  });

});

describe('#cbc/field/struct', () => {
  const testStruct = {
    name: 'testStruct',
    type: 'struct',
    fields: [
      {
        name: 'latitude',
        type: 'int',
        size: 18,
        encalc: 'v*1000',
        decalc: 'v/1000',
      },
      {
        name: 'longitude',
        type: 'int',
        size: 19,
        encalc: 'v*1000',
        decalc: 'v/1000',
      }
    ]
  };

  it('should encode a struct', () => {
    const decoded = {
      latitude: 33.1,
      longitude: -117.2,
    };
    let buffer = Buffer.from([]);
    let offset = 0;
    ({buffer,offset} = encodeField(testStruct, decoded, buffer, offset));
    expect(buffer).to.have.length(Math.ceil((18+19)/8));
    let {decoded: readback} = decodeField(testStruct, buffer, 0);
    for (const [k, v] of Object.entries(decoded))
      expect(readback.value[k]).to.equal(v);
  });

});

describe('#cbc/field/bitmask', () => {
  const testBitmask = {
    name: 'testBitmask',
    type: 'bitmask',
    size: 8,
    enum: {
      0: 'bit0',
      1: 'bit1',
      5: 'bit5',
    }
  };

  it('should encode a bitmask', () => {
    let buffer = Buffer.from([]);
    const testCases = [0b100010, ['bit1', 'bit5']];
    for (const tc of testCases) {
      ({ buffer } = encodeField(testBitmask, tc, buffer, 0));
      expect(buffer).to.have.length(1);
      expect(buffer[0]).to.equal(testCases[0]);
    }
  });

  it('should decode a bitmask', () => {
    let buffer = Buffer.from([0b100010]);
    let offset = 0;
    let { decoded } = decodeField(testBitmask, buffer, offset);
    expect(decoded.value).to.be.an('array').with.length(2);
    const expected = ['bit1', 'bit5'];
    for (const b of expected)
      expect(decoded.value.includes(b)).to.equal(true);
  });

});

describe('#cbc/field/bitmaskarray', () => {
  const testCase1 = {
    fieldDef: {
      name: 'testBitmaskarray',
      type: 'bitmaskarray',
      size: 8,
      enum: { 0: 'bit0', 1: 'bit1', 2: 'bit2'},
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
      name: 'testBitmaskarray',
      type: 'bitmaskarray',
      value: [
        { "bit0": {"kpi1": 1, "kpi2": 2}},
        { "bit2": {"kpi1": 0, "kpi2": 2}},
      ],
    },
  };
  
  const testCases = [testCase1,];
  
  it('should encode a bitkeylist', () => {
    for (const tc of testCases) {
      const { fieldDef, encoded, decoded } = tc;
      let buffer = Buffer.from([0]);
      let offset = 0;
      ({buffer,offset} = encodeField(fieldDef, decoded.value, buffer, offset));
      expect(Buffer.compare(buffer, Buffer.from(encoded))).to.equal(0);
    }
  });
  
  it('should decode a bitkeylist', () => {
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

function stringifyBigInt(obj) {
  return JSON.parse(JSON.stringify(obj, (k, v) =>
      typeof v === 'bigint' ? v.toString() : v
  ));
}

describe('#cbc/message', function () {
  
  const testMessage = {
    direction: 'UPLINK',
    messageKey: 1,
    name: 'testMessage',
    fields: [
      {
        name: 'imsi',
        type: 'uint',
        size: 50,
      },
      {
        name: 'location',
        type: 'struct',
        fields: [
          {
            name: 'latitude',
            type: 'int',
            size: 18,
            encalc: 'v*1000',
            decalc: 'v/1000',
          },
          {
            name: 'longitude',
            type: 'int',
            size: 19,
            encalc: 'v*1000',
            decalc: 'v/1000',
          }
        ]
      }
    ]
  }

  it('should encode a message', () => {
    const decoded = {
      direction: 'UPLINK',
      messageKey: 1,
      name: 'testMessage',
      fields: {
        imsi: 90180020000364n,
        location: {
            latitude: 33.126,
            longitude: -117.265,
        }
      }
    };
    const encoded = encodeMessage(decoded, testMessage, true);
    expect(Buffer.isBuffer(encoded)).to.equal(true);
    const reread = decodeMessage(encoded, testMessage, true);
    const s1 = stringifyBigInt(reread);
    const s2 = stringifyBigInt(decoded);
    const delta = [];
    for (let i = 0; i < s1.length; i++) {
      if (s1[i] !== s2[i])
        delta.push(i);
    }
    expect(delta).to.have.length(0);
  });

  it('should encode a CoAP message', () => {
    const msgCodec = require('./codecs/ntn-poc-cbc-coap.json').messages[0];
    const decoded = {
      direction: msgCodec.direction,
      messageKey: msgCodec.messageKey,
      name: msgCodec.name,
      fields: {
        coapPayloadMarker: 0xFF,
        imsi: 999999999999999n,
        secOfDay: 0,
        tac: 0xABCD,
        rsrp: 99,
        rsrq: 31,
        sinr: 31,
      }
    }
    // let imsiEncoded = [241, 175, 212, 152, 207, 255, 224];
    const encoded = encodeMessage(decoded, msgCodec, true);
    expect(Buffer.isBuffer(encoded)).equals(true);
    const {decoded: readback} = decodeMessage(encoded, msgCodec, true);
    expect(decoded).to.be.an('object');
  });

});
