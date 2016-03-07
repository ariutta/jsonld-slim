# jsonld-next

This is a version of [jsonld.js](https://github.com/digitalbazaar/jsonld.js) in [ES.next](https://github.com/esnext/esnext), with the goal of making it as small as possible while still supporting the test suite.

```
uglifyjs ./node_modules/jsonld/js/jsonld.js -o jsonld.old.min.js
```
=> 120,758 B

```
rollup -c rollup.config.browser.js
```
=> 90,357 B

Further enhancements over jsonld.js:
* Runs `setImmediate` at "full speed" in all modern browsers and Node via [setImmediate polyfill](https://github.com/YuzuJS/setImmediate)
* Enables http caching in Node.js via [superagent-cache](https://github.com/jpodwys/superagent-cache). superagent-cache is not used in the browser, because browsers natively support http caching.

## Installation

```
git clone https://github.com/ariutta/jsonld-next.git
cd jsonld-next
npm install
```

You can re-run the build step at any time, if you choose:
```
npm run build
```

## Testing (doesn't work for new yet)

Clone the following two repos as sibling directories of the directory for your local `jsonld-next` repo:

```
git clone https://github.com/json-ld/normalization.git
git clone https://github.com/json-ld/json-ld.org.git
```

### TEMPORARY WORKAROUND
Currently only passes automated tests for Node. There is a problem with the browser tests. So here's a temporary workaround.

```
npm test-node
```

You can see it working in the browser:
```
http-server
```

Then visit http://localhost:8080/ and open the browser console to see it running every fully fleshed-out example from the jsonld.js README.

### WHAT IS SUPPOSED TO WORK
The following doesn't work at the moment because of the browser tests:

Then run the tests: `npm test`

If you're on Windows, you may need to instead run: `npm run test-windows`
