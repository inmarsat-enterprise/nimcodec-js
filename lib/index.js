/**
 * A set of codec libraries for Non-IP Modems
 * @module nimcodec
 */

const nimo = require('./codecs/nimo');
const cbc = require('./codecs/cbc');
const bitman = require('./bitman');

module.exports = {
  cbc,
  nimo,
  bitman,
};