/**
 * Codec functions for Non-IP Modems based on ORBCOMM protocols
 * @namespace nimo
 */
const { decodeMessage, encodeMessage } = require('./message');
const { importCodec, exportJson, exportXml } = require('./codeckey');

module.exports = {
  decodeMessage,
  encodeMessage,
  importCodec,
  exportJson,
  exportXml,
};