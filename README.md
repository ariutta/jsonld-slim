# jsonld-slim

This is an stripped-down version of [jsonld.js](https://github.com/digitalbazaar/jsonld.js), made as small as possible. Promises not supported.

## Installation

```
git clone https://github.com/ariutta/jsonld-slim.git
cd jsonld-slim
npm install
```

## Testing

Clone the following two repos as sibling directories of the directory for your local `jsonld-slim` repo:

```
git clone https://github.com/json-ld/normalization.git
git clone https://github.com/json-ld/json-ld.org.git
```

Then run the tests: `npm test`

If you're on Windows, you may need to instead run: `npm run test-windows`
