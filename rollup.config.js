//import multiEntry from 'rollup-plugin-multi-entry';

export default {
  //entry: ['dist/dev/jsonld.js', 'dist/dev/URGNA2012.js', 'dist/dev/_esnextifiedPrivateJsonLdProcessor.js', 'dist/dev/*.js'],
  //entry: 'dist/dev/*.js',
  entry: './lib/main.js',
  format: 'umd',
  moduleName: 'jsonld',
  //plugins: [multiEntry()]
};
