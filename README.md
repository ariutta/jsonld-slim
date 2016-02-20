# jsonld-next

This is a version of [jsonld.js](https://github.com/digitalbazaar/jsonld.js) in [ES.next](https://github.com/esnext/esnext), with the goal of making it as small as possible while still supporting the test suite.

Current results from browserifying with uglify transform:

```
browserify js/jsonld.js | uglifyjs -c > bundle.js
```

jsonld.js bundle size: 131566
jsonld-next bundle size: 119520

Any suggestions for making it smaller?

## Installation

OLD:

```
git clone https://github.com/ariutta/jsonld-next.git
cd jsonld-next
npm install
```

IN PROGRESS:
```
git clone https://github.com/ariutta/jsonld-next.git
cd jsonld-next
npm install
node ./scripts/es-nextify.js
rollup -c -o ./bundle.js
node ./trye.js
```


## Testing (doesn't work for new yet)

Clone the following two repos as sibling directories of the directory for your local `jsonld-next` repo:

```
git clone https://github.com/json-ld/normalization.git
git clone https://github.com/json-ld/json-ld.org.git
```

Then run the tests: `npm test`

If you're on Windows, you may need to instead run: `npm run test-windows`
