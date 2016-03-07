var _ = require('lodash');
var grasp = require('grasp');
var Rx = require('rx');

function run(options) {
  var engine = options.engine;
  var source = options.source;
  var query = options.query;
  var replacement = options.replacement;

  var args = {
    _: [query],
    engine: engine,
    json: true
  };
  if (replacement) {
    if (typeof replacement === 'function') {
      args.replaceFunc = replacement;
    } else {
      args.replace = replacement;
    }
  }

  var subject = new Rx.ReplaySubject();

  grasp({
    args: args,
    input: source,
    error: function(err) {
      subject.onError(err);
    },
    exit: function(arg$, results) {
      JSON.parse(results).forEach(function(item) {
        if (typeof item === 'string') {
          subject.onNext(rxGrasp(item));
        } else {
          var nodeSource = source.slice(item.start, item.end + 1);
          wrap(item, nodeSource);
          subject.onNext(item);
        }
      });
      subject.onCompleted();
    }
  });

  return subject;
}

function wrap(wrapped, source) {
  wrapped = wrapped || {};
  wrapped.source = source;

  wrapped.search = function(query) {
    return run({
      engine: 'grasp-squery',
      query: query,
      source: source
    });
  };
  wrapped.searchE = function(query) {
    return run({
      engine: 'grasp-equery',
      query: query,
      source: source
    });
  };
  wrapped.replace = function(query, replacement) {
    return run({
      engine: 'grasp-squery',
      query: query,
      source: source,
      replacement: replacement
    });
  };
  wrapped.replaceE = function(query, replacement) {
    return run({
      engine: 'grasp-equery',
      query: query,
      source: source,
      replacement: replacement
    });
  };

  return wrapped;
}

function rxGrasp(source) {
  return wrap({}, source);
}

function getNamedElementName(input) {
  var namedKeyCandidateLists = [
    ['name'],
    ['object'],
    ['id'],
    ['left', 'callee'],
    ['declarations'],
    ['expression']
  ];

  var inputKeys = _.keys(input);

  var matchingList = _.find(namedKeyCandidateLists, function(namedKeyCandidateList) {
    return _.intersection(inputKeys, namedKeyCandidateList).length > 0;
  });

  var matchingKey = _.head(_.intersection(matchingList, inputKeys));
  var matchingPropertyValue = input[matchingKey];

  if (matchingKey === 'declarations') {
    matchingPropertyValue = matchingPropertyValue[0];
    if (matchingPropertyValue.length > 1) {
      throw new Error('Cannot handle multiple inline variable declarations.');
    }
  }

  if (matchingKey === 'name') {
    return matchingPropertyValue;
  } else if (matchingKey === 'id' && !matchingPropertyValue) {
    return;
  } else {
    return getNamedElementName(matchingPropertyValue);
  }
}

function getNamedElementParent(input, previousInput) {
  var namedKeyCandidateLists = [
    ['name'],
    ['object'],
    ['id'],
    ['left', 'callee'],
    ['declarations'],
    ['expression']
  ];

  var inputKeys = _.keys(input);

  var matchingList = _.find(namedKeyCandidateLists, function(namedKeyCandidateList) {
    return _.intersection(inputKeys, namedKeyCandidateList).length > 0;
  });

  var matchingKey = _.head(_.intersection(matchingList, inputKeys));
  var matchingPropertyValue = input[matchingKey];

  if (matchingKey === 'declarations') {
    matchingPropertyValue = matchingPropertyValue[0];
    if (matchingPropertyValue.length > 1) {
      throw new Error('Cannot handle multiple inline variable declarations.');
    }
  }

  // TODO still not handling prototypes quite right, e.g., Processor.prototype.alskdn
  if ((matchingKey === 'name') || (matchingKey === 'id' && !matchingPropertyValue)) {
    return previousInput;
  } else {
    return getNamedElementParent(matchingPropertyValue, input);
  }
}

rxGrasp.getNamedElementParent = getNamedElementParent;

/**
 * getFirstAndSecondNames
 *
 * Get the name of the variable or function declared in this node,
 * if a var-dec or func-dec, e.g., each of the following:
 *    var a = 1;
 *
 *    function a() {};
 *
 *    a.prototype.b = 1;
 *
 *    return first of "a" and second of undefined
 *
 * Otherwise, get the key and property names of an expression statement, e.g.:
 *    a.b = 1;
 *    returns first of "a" and second of "b"
 *
 * @param node
 * @returns {undefined}
 */
function getFirstAndSecondNames(node, mainModuleName) {
  var namedElementParent = getNamedElementParent(node);
  var first = namedElementParent.object && namedElementParent.object.name;
  var second;
  if (first) {
    var secondCandidate = namedElementParent.property && namedElementParent.property.name;
    if (secondCandidate !== 'prototype') {
      second = secondCandidate;
    }
  } else {
    first = getNamedElementName(node) || mainModuleName;
  }

  return {
    first: first,
    second: second
  };
}

rxGrasp.getFirstAndSecondNames = getFirstAndSecondNames;

module.exports = rxGrasp;
