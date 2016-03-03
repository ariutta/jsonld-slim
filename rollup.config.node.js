import config from './rollup.config';

config.format = 'cjs';
config.dest = 'dist/node/jsonld.js';

export default config;
