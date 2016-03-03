var _nodejs = false;
var _browser = !_nodejs;

if (typeof XMLSerializer === 'undefined') {
  /* jshint ignore:start */
  XMLSerializer = require('xmldom').XMLSerializer;
  /* jshint ignore:end */
}

import 'setimmediate';

function wrapper(jsonld) {
  jsonld.setImmediate = jsonld.nextTick = setImmediate;
