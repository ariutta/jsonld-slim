import '../dist/dev/esNextifiedMain.js';
import * as jsonldModule from '../dist/dev/jsonld.js';

var _nodejs = false;
var _browser = !_nodejs;

if (typeof XMLSerializer === 'undefined') {
  /* jshint ignore:start */
  XMLSerializer = require('xmldom').XMLSerializer;
  /* jshint ignore:end */
}

function wrapper(jsonld) {
  return jsonld;
}

// TODO is this the best design pattern to use?
// used to generate a new jsonld API instance
var factory = function() {
  return wrapper(function() {
    return factory(jsonldModule);
  });
};

wrapper(factory);

module.exports = factory;  
