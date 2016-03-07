var fs = require('fs-extra');
var path = require('path');

var jsonldPkg = require('./node_modules/jsonld/package.json');
var jsonldNextPkg = require('./package.json');

var jsonldVersion = jsonldPkg.version;
var jsonldNextVersion = jsonldNextPkg.version;

if (jsonldNextVersion.indexOf(jsonldVersion) === -1) {
  console.warn('Version mismatch: jsonld="' + jsonldVersion + '" vs. jsonld-next="' + jsonldNextVersion + '"');
}

export default {
  entry: './lib/main.js',
  moduleName: 'jsonld',
  outro: [
    fs.readFileSync(path.join('./lib/outro.js')),
  ].join('\n'),
  sourceMap: true
};
