import babel from 'rollup-plugin-babel';
import includePaths from 'rollup-plugin-includepaths';

import config from './rollup.config';

var fs = require('fs-extra');
var path = require('path');
var pkg = require('./package.json');

config.format = 'cjs';
config.dest = 'dist/node/jsonld.js';

config.outro = [
  config.outro || '',
  //'global.jsonld = factory();',
  'factory.version = \'' + pkg.version + '\';'
].join('\n');

config.plugins = [
  includePaths({
    include: {},
    paths: ['lib', 'dist/esnext'],
    external: [],
    extensions: ['.js', '.json', '.html']
  }),
  babel({
    exclude: 'node_modules/**'
  }),
];

export default config;
