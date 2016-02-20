//module.exports = require('./dist/jsonld.js');
var bundle = require('./bundle.js');

global['_nodejs'] = true;

module.exports = bundle;
