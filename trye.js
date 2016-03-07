//var jsonld = require('./index.js');
var jsonld = require('./dist/node/jsonld');

console.log('jsonld');
console.log(jsonld);
console.log('jsonld.parseLinkHeader');
console.log(jsonld.parseLinkHeader);
console.log('jsonld.documentLoader');
console.log(jsonld.documentLoader);

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

var docToFrame = {
  "@context": {
    "dc": "http://purl.org/dc/elements/1.1/",
    "ex": "http://example.org/vocab#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "ex:contains": {
      "@type": "@id"
    }
  },
  "@graph": [
    {
      "@id": "http://example.org/library",
      "@type": "ex:Library",
      "ex:contains": "http://example.org/library/the-republic"
    },
    {
      "@id": "http://example.org/library/the-republic",
      "@type": "ex:Book",
      "dc:creator": "Plato",
      "dc:title": "The Republic",
      "ex:contains": "http://example.org/library/the-republic#introduction"
    },
    {
      "@id": "http://example.org/library/the-republic#introduction",
      "@type": "ex:Chapter",
      "dc:description": "An introductory chapter on The Republic.",
      "dc:title": "The Introduction"
    }
  ]
};

var frame = {
  "@context": {
    "dc": "http://purl.org/dc/elements/1.1/",
    "ex": "http://example.org/vocab#"
  },
  "@type": "ex:Library",
  "ex:contains": {
    "@type": "ex:Book",
    "ex:contains": {
      "@type": "ex:Chapter"
    }
  }
};

var docWithRemoteContext = {
  '@context': 'http://json-ld.org/contexts/person.jsonld',
  '@id': 'http://dbpedia.org/resource/John_Lennon',
  'name': 'John Lennon',
  'born': '1940-10-09',
  'spouse': 'http://dbpedia.org/resource/Cynthia_Lennon'
};

jsonld.compact(docWithRemoteContext, docWithRemoteContext['@context'], function(err, compacted) {
  if (err) {
    console.log('err');
    console.log(err);
  }
  console.log('compacted');
  console.log(JSON.stringify(compacted, null, 2));//  //  {
  //    "@context": {...},
  //    "name": "Manu Sporny",
  //    "homepage": "http://manu.sporny.org/",
  //    "image": "http://manu.sporny.org/images/manu.png"
  //  }
});

jsonld.expand(docWithRemoteContext, function(err, expanded) {
  if (err) {
    console.log('err');
    console.log(err);
  }
  console.log('expanded');
  console.log(JSON.stringify(expanded, null, 2));
  //  {
  //    "http://schema.org/name": [{"@value": "Manu Sporny"}],
  //    "http://schema.org/url": [{"@id": "http://manu.sporny.org/"}],
  //    "http://schema.org/image": [{"@id": "http://manu.sporny.org/images/manu.png"}]
  //  }
});


//*
// frame a document
// see: http://json-ld.org/spec/latest/json-ld-framing/#introduction
jsonld.frame(docToFrame, frame, function(err, framed) {
  // document transformed into a particular tree structure per the given frame
  if (err) {
    console.log('err');
    console.log(err);
    throw err;
  }
  console.log('framed');
  console.log(JSON.stringify(framed, null, 2));
});
//*/

jsonld.compact(doc, context, function(err, compacted) {
  if (err) {
    console.log('err');
    console.log(err);
  }
  console.log('compacted');
  console.log(JSON.stringify(compacted, null, 2));//  //  {
  //    "@context": {...},
  //    "name": "Manu Sporny",
  //    "homepage": "http://manu.sporny.org/",
  //    "image": "http://manu.sporny.org/images/manu.png"
  //  }
});

jsonld.expand(doc, function(err, expanded) {
  if (err) {
    console.log('err');
    console.log(err);
  }
  console.log('expanded');
  console.log(JSON.stringify(expanded, null, 2));
  //  {
  //    "http://schema.org/name": [{"@value": "Manu Sporny"}],
  //    "http://schema.org/url": [{"@id": "http://manu.sporny.org/"}],
  //    "http://schema.org/image": [{"@id": "http://manu.sporny.org/images/manu.png"}]
  //  }
});

jsonld().expand(doc, function(err, expanded) {
  if (err) {
    console.log('err');
    console.log(err);
  }
  console.log('expanded');
  console.log(JSON.stringify(expanded, null, 2));
  //  {
  //    "http://schema.org/name": [{"@value": "Manu Sporny"}],
  //    "http://schema.org/url": [{"@id": "http://manu.sporny.org/"}],
  //    "http://schema.org/image": [{"@id": "http://manu.sporny.org/images/manu.png"}]
  //  }
});

var first = jsonld();
first.ActiveContextCache = 1;

var second = jsonld();
console.log('second.ActiveContextCache');
console.log(second.ActiveContextCache);

var third = second();
console.log('third.ActiveContextCache');
console.log(third.ActiveContextCache);
