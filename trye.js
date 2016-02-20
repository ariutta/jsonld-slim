var jsonld = require('./index.js');

var doc = {
  "http://schema.org/name": "Manu Sporny",
  "http://schema.org/url": {"@id": "http://manu.sporny.org/"},
  "http://schema.org/image": {"@id": "http://manu.sporny.org/images/manu.png"}
};
var context = {
  "name": "http://schema.org/name",
  "homepage": {"@id": "http://schema.org/url", "@type": "@id"},
  "image": {"@id": "http://schema.org/image", "@type": "@id"}
};

//*
// compact a document according to a particular context
// see: http://json-ld.org/spec/latest/json-ld/#compacted-document-form
jsonld.jsonldCompact(doc, context, function(err, compacted) {
  console.log('err');
  console.log(err);
  console.log('compacted');
  console.log(JSON.stringify(compacted, null, 2));
//  {
//    "@context": {...},
//    "name": "Manu Sporny",
//    "homepage": "http://manu.sporny.org/",
//    "image": "http://manu.sporny.org/images/manu.png"
//  }
});
//*/

jsonld.jsonldExpand(doc, function(err, expanded) {
  console.log('err');
  console.log(err);
  console.log('expanded');
  console.log(JSON.stringify(expanded, null, 2));
//  {
//    "http://schema.org/name": [{"@value": "Manu Sporny"}],
//    "http://schema.org/url": [{"@id": "http://manu.sporny.org/"}],
//    "http://schema.org/image": [{"@id": "http://manu.sporny.org/images/manu.png"}]
//  }
});
