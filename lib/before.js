import documentLoaderCreator from '../lib/documentLoaderCreator.js';
import 'setimmediate';

var _nodejs = false;
var _browser = !_nodejs;

if (typeof XMLSerializer === 'undefined') {
  /* jshint ignore:start */
  XMLSerializer = require('xmldom').XMLSerializer;
  /* jshint ignore:end */
}

function wrapper(jsonld) {
  jsonld.setImmediate = jsonld.nextTick = setImmediate;
