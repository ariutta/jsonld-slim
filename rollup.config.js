import multiEntry from 'rollup-plugin-multi-entry';

export default {
  //entry: ['dist/dev/URGNA2012.js', 'dist/dev/jsonldCompact.js', 'dist/dev/*.js'],
  entry: ['dist/dev/jsonld.js', 'dist/dev/URGNA2012.js', 'dist/dev/_esnextifiedPrivateJsonLdProcessor.js', 'dist/dev/*.js'],
  //entry: 'dist/dev/*.js',
  format: 'cjs',
  plugins: [multiEntry()]
};
