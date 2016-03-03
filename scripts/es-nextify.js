/*
 * 1) Create a module that exports every publicly available element (functions, variables, etc.),
 *    including an export for every property if the publicly available elements are made available
 *    as properties.
 *    Also create a module for every element at the same level as the main export or higher.
 * 2) For every created module, import its dependencies.
 */


var _ = require('lodash');
var fs = require('fs');
var grasp = require('grasp');
var path = require('path');
var Rx = require('rx');
var strcase = require('tower-strcase');

const libraryName = 'jsonld';
const declobberNamespace = '_esn';
const DOT = 'DOT';
const mainModuleName = declobberNamespace + 'main';

var beforeString = fs.readFileSync(path.join(__dirname, '..', 'lib', 'before.js'));
var afterString = fs.readFileSync(path.join(__dirname, '..', 'lib', 'after.js'));

var neededFunctions = [
  'wrapper',
];
var sourcePath = path.join(__dirname, '..', 'node_modules', 'jsonld', 'js', 'jsonld.js');
var sourceString = fs.readFileSync(sourcePath, {encoding: 'utf8'});

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

/**
 * getFirstAndSecondNames
 *
 * Get the name of the variable or function declared in this node, if a var-dec or func-dec, e.g., each of the following:
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
function getFirstAndSecondNames(node) {
  var namedElementParent = getNamedElementParent(node);
  var first = namedElementParent.object && namedElementParent.object.name && namedElementParent.object.name;
  var second;
  if (first) {
    var secondCandidate = namedElementParent.property && namedElementParent.property.name && namedElementParent.property.name;
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

var topLevelSelector = 'var-dec[id=#wrapper][init=func-exp].init.body';

var cleanSourceString = sourceString
      .replace(/var\ http\ \=\ require\('http'\);/g, '')
      .replace(/(^|[^\\-\\w\'\"\\.])(http.STATUS_CODES)(\\W|$)/g, '$1nodeStatusCodes$3');

var replacements = [{
  selector: topLevelSelector + ' > exp-statement! > assign[left.object.name=' + libraryName + '][left.property.name=documentLoader]',
  replacer: function(getRaw, node, query) {
    var newText = fs.readFileSync(__dirname + '/../lib/documentLoader.js', {encoding: 'utf8'});
    return newText;
  }
}, {
  selector: topLevelSelector + ' > exp-statement![expression.left.object.name=jsonld][expression.left.property.name=objectify]',
  replacer: function(getRaw, node, query) {
    return '';
  }
}, {
  selector: topLevelSelector + ' > exp-statement! > AssignmentExpression #DocumentCache',
  replacer: function(getRaw, node, query) {
    return '';
  }
}, {
  selector: topLevelSelector + ' > exp-statement! > assign > assign.left [name=documentLoaders]',
  replacer: function(getRaw, node, query) {
    return '';
  }
}, {
  selector: topLevelSelector + ' > exp-statement! > assign[left.object.name=' + libraryName + '][left.property.name=useDocumentLoader]',
  replacer: function(getRaw, node, query) {
    return '';
  }
}, {
  selector: topLevelSelector + ' > exp-statement! > assign[left.object.name=' + libraryName + '][left.property.name=loadDocument]',
  replacer: function(getRaw, node, query) {
    return '';
  }
}, {
  selector: topLevelSelector + ' assign.right member > [name=loadDocument]',
  replacer: function(getRaw, node, query) {
    return 'documentLoader';
  }
}, {
  selector: 'var-decs! > var-dec > #_browser,IfStatement! > IfStatement.test [name=_browser],IfStatement! > IfStatement.test[name=_browser],IfStatement! > IfStatement.test[left.name=_browser]',
  replacer: function(getRaw, node, query) {
    return '';
  }
}, {
  selector: 'var-decs! > var-dec > #_nodejs,IfStatement! > IfStatement.test [name=_nodejs],IfStatement! > IfStatement.test[name=_nodejs],IfStatement! > IfStatement.test[left.name=_nodejs]',
  replacer: function(getRaw, node, query) {
    return '';
  }
}];

var firstReplacement = replacements[0];
var firstNode = rxGrasp(cleanSourceString).replace(firstReplacement.selector, firstReplacement.replacer);
Rx.Observable.from(replacements.slice(1))
  .reduce(function(nodeO, replacement, index, source) {
    return nodeO.concatMap(function(node) {
      return node.replace(replacement.selector, replacement.replacer);
    });
  }, firstNode)
  .concatMap(function(nodeO) {
    return nodeO;
  })
  /*
  .concatMap(function(node) {
    var nodeSource = node.source;
    return rxGrasp(nodeSource).search('IfStatement! > IfStatement.test[name=_nodejs]')
      .toArray()
      .doOnNext(function(nodes) {
        var nodePolyfillString = nodes.map(function(node) {
          return node.source;
        })
        .join('\n');
        var destPath = path.join(__dirname, '..', 'dist', libraryName, 'node-polyfills.js');
        console.log('nodePolyfillString');
        console.log(nodePolyfillString);
        fs.writeFileSync(destPath, nodePolyfillString, {encoding: 'utf8'});
      })
      .map(function(nodes) {
        return nodeSource;
      });
  })
  //*/
  //*
  .map(function(node) {
    var reInput = '(\\W|^)(_nodejs)(\\W|$)';
    var re = new RegExp(reInput, 'gm');
    return node.source.replace(re, '$1$3');
  })
  .map(function(nodeSource) {
    var reInput = '(\\W|^)(_browser)(\\W|$)';
    var re = new RegExp(reInput, 'gm');
    return nodeSource.replace(re, '$1$3');
  })
  //*/
  .concatMap(function(nodeSource) {
    fs.writeFileSync('./output.js', nodeSource, {encoding: 'utf8'});

    var moduleCandidatesSearchStrings = [
      topLevelSelector + ' > exp-statement',
      topLevelSelector + ' > func-dec',
      topLevelSelector + ' > var-decs! > var-dec',
    ];
    var moduleCandidatesSearchString = moduleCandidatesSearchStrings.join(',');

    return rxGrasp(nodeSource).search(moduleCandidatesSearchString)
      .toArray()
      .concatMap(function(nodes) {
        var elementsGroupedByFirstName = _.reduce(nodes, function(accumulator, node) {
          var firstAndSecondNames = getFirstAndSecondNames(node);
          var first = firstAndSecondNames.first;
          var second = firstAndSecondNames.second;
          accumulator[first] = accumulator[first] || [];
          var element = _.find(accumulator[first], function(elementFromFirstNameGroup) {
            return elementFromFirstNameGroup.second === second;
          });

          if (!element) {
            accumulator[first].push({
              first: first,
              second: second,
              source: node.source
            });
          } else {
            element.source += '\n' + node.source + '\n';
          }

          return accumulator;
        }, {});

        var firstAndSecondNames = _.toPairs(elementsGroupedByFirstName)
          .map(function(pair) {
            var result = {};
            result[pair[0]] = pair[1].map(function(item) {
              return item.second;
            });
            return result;
          });

        var moduleElements = _.toPairs(elementsGroupedByFirstName)
          .reduce(function(accumulator, pair) {
            var first = pair[0];
            var moduleElementsWithSelectedFirstName = pair[1];
            return accumulator.concat(moduleElementsWithSelectedFirstName
              .map(function(oneModuleElementWithSelectedFirstName) {
                var second = oneModuleElementWithSelectedFirstName.second;
                var source = oneModuleElementWithSelectedFirstName.source;

                var moduleName = second ? first + DOT + second : first;

                return {
                  first: first,
                  second: second,
                  moduleName: moduleName,
                  source: source
                }
              }));
          }, []);

          var moduleElementsWithSecondNames = _.filter(moduleElements, function(moduleItem) {
              return !!moduleItem.second;
            });

        return Rx.Observable.from(moduleElements)
          .map(function(moduleItem) {
            var first = moduleItem.first;
            var second = moduleItem.second;
            var moduleName = moduleItem.moduleName;
            var source = moduleItem.source;

            source = moduleElementsWithSecondNames
              .reduce(function(accumulator, iteratorModuleItem) {
                var reInput = '(\\W|^)(' + iteratorModuleItem.first + '\\.' + iteratorModuleItem.second + ')(\\W|$)';
                var re = new RegExp(reInput, 'gm');
                return accumulator.replace(re, '$1' + iteratorModuleItem.moduleName + '$3');
              }, source);

            if (source.indexOf('var ' + moduleName) > -1) {
              source = source.replace('var ' + moduleName, 'export const ' + moduleName)
            } else if (source.indexOf('const ' + moduleName) > -1) {
              source = source.replace('const ' + moduleName, 'export const ' + moduleName)
            } else if (source.indexOf('function ' + moduleName) > -1) {
              source = source.replace('function ' + moduleName, 'export const ' + moduleName + ' = function')
            } else if (source.indexOf(moduleName) > -1) {
              source = 'export const ' + source;
            } else {
              source += '\nexport const ' + moduleName + ' = ' + moduleName + ';';
            }

            source = _.filter(moduleElements, function(iteratorModuleItem) {
                return iteratorModuleItem.moduleName !== moduleName;
              })
              .reduce(function(accumulator, iteratorModuleItem) {
                var iteratorFirstName = iteratorModuleItem.first;
                var iteratorExportName = iteratorModuleItem.second;
                var iteratorModuleName = iteratorModuleItem.moduleName;
                var reInput = '(\\W|^)(' + iteratorModuleName + ')(\\W|$)';
                var re = new RegExp(reInput, 'gm');
                if (re.test(source)) {
                  return 'import {' + iteratorModuleName + '} from \'./' + iteratorModuleName + '\';\n' + accumulator;
                } else {
                  return accumulator
                }
              }, source);

            return {
              moduleName: moduleName,
              first: first,
              second: second,
              source: source
            };
          })
      });
  })
  .doOnNext(function(output) {
    var moduleName = output.moduleName;
    var source = output.source;
    var destPath = path.join(__dirname, '..', 'dist', libraryName, moduleName + '.js');
    fs.writeFileSync(destPath, source, {encoding: 'utf8'});
  })
  .toArray()
  .subscribe(function(outputs) {
    var libraryFile = 'import \'./' + mainModuleName + '.js\';\n' + 
      outputs.filter(function(output) {
        return output.first === libraryName;
      })
      .map(function(output) {
        return 'import {' + output.moduleName + '} from \'./' + output.moduleName + '\';\n' +
          'export const ' + output.second + ' = ' + output.moduleName + ';';
      })
      .join('\n');

    var destPath = path.join(__dirname, '..', 'dist', libraryName, libraryName + '.js');
    fs.writeFileSync(destPath, libraryFile, {encoding: 'utf8'});

    var oneOutputString = outputs.map(function(output) {
      return output.source;
    })
    .join('\n\n\n\\\\*********** EOF ***********\n\n\n\n\n');
    fs.writeFileSync('./output.js', oneOutputString, {encoding: 'utf8'});
  }, function(err) {
    throw err;
  }, function() {
    console.log('Build completed');
  });
