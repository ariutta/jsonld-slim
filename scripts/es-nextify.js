/*
 * 1) Create a module that exports every publicly available element (functions, variables, etc.),
 *    including an export for every property if the publicly available elements are made available
 *    as properties.
 *    Also create a module for every element at the same level as the main export or higher.
 * 2) For every created module, import its dependencies.
 */


// find all publicly available methods, e.g., jsonld.compact
// rename "jsonld.compact =" in source to "var jsonldCompact ="
// rename jsonld.compact everywhere else in source to jsonldCompact
// split out jsonldCompact into its own file and append "export default jsonldCompact"
// any modules that depend on jsonldCompact need to import it
//
// do the same for Processor.prototype, e.g., "Processor.prototype.compact" and "Processor().compact"
// do similar for top-level methods, e.g., "_getInitialContext"

var _ = require('lodash');
var fs = require('fs');
var grasp = require('grasp');
var path = require('path');
var Rx = require('rx');
var strcase = require('tower-strcase');

var version = 'dev';
var libraryName = 'jsonld';
var mainModuleName = 'esNextifiedMain';

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

  /*
  if (matchingPropertyValue && matchingPropertyValue.name && matchingPropertyValue.name === 'Processor') {
    console.log('input');
    console.log(input);
  }
  //*/

  // TODO still not handling prototypes quite right, e.g., Processor.prototype.alskdn
  if ((matchingKey === 'name') || (matchingKey === 'id' && !matchingPropertyValue)) {
    return previousInput;
  } else {
    return getNamedElementParent(matchingPropertyValue, input);
  }
}

function getModuleAndExportNames(node) {
  var namedElementParent = getNamedElementParent(node);
  var topLevelName = namedElementParent.object && namedElementParent.object.name && namedElementParent.object.name;
  var secondLevelName;
  var moduleName;
  var exportName;
  if (topLevelName) {
    moduleName = topLevelName;
    secondLevelName = namedElementParent.property && namedElementParent.property.name && namedElementParent.property.name;
    if (secondLevelName !== 'prototype') {
      exportName = secondLevelName;
    }
  } else {
    moduleName = getNamedElementName(node) || mainModuleName;
  }

  return {
    moduleName: moduleName,
    exportName: exportName
  };
}

/*
function getNamedProperty(input) {
  var namedKeyCandidateLists = [
    ['property'],
    ['object'],
    ['id'],
    ['left', 'callee'],
    ['expression']
  ];

  var inputKeys = _.keys(input);

  var matchingList = _.find(namedKeyCandidateLists, function(namedKeyCandidateList) {
    return _.intersection(inputKeys, namedKeyCandidateList).length > 0;
  });

  var matchingKey = _.head(_.intersection(matchingList, inputKeys));
  var matchingProperty = input[matchingKey];
  if (matchingKey === 'property' && matchingProperty.name) {
    return matchingProperty.name;
  } else if (matchingKey === 'id' && !matchingProperty) {
    return;
  } else if (matchingKey) {
    return getNamedProperty(matchingProperty);
  }
}
//*/

/*
function getExportName(mainModuleName, node) {
  var name = getNamedProperty(node);
  if (name) {
    return name;
  } else {
    return getModuleName(mainModuleName, node);
  }
}
//*/

//rxGrasp(sourceString).search('assign.left! [name=jsonld],var-dec[id=#wrapper][init=func-exp].init.body > var-decs > var-dec')

var topLevelSelector = 'var-dec[id=#wrapper][init=func-exp].init.body';

rxGrasp(sourceString).replace(topLevelSelector + ' > exp-statement! > assign[left.object.name=' + libraryName + '][left.property.name=documentLoader]', function(getRaw, node, query) {
    var newText = fs.readFileSync(__dirname + '/../lib/documentLoader.js', {encoding: 'utf8'});
    return newText;
  })
  .concatMap(function(node) {
    // var-dec[id=#wrapper][init=func-exp].init.body > exp-statement! > assign[left.object.name=jsonld][left.property.name=documentLoaders]
    return node.replace(topLevelSelector + ' > exp-statement! > assign > assign.left [name=documentLoaders]', function(getRaw, node, query) {
      return '';
    });
  })
  .concatMap(function(node) {
    return node.replace(topLevelSelector + ' > exp-statement! > assign[left.object.name=' + libraryName + '][left.property.name=useDocumentLoader]', function(getRaw, node, query) {
      return '';
    });
  })
  .concatMap(function(node) {
    return node.replace(topLevelSelector + ' > exp-statement! > assign[left.object.name=' + libraryName + '][left.property.name=loadDocument]', function(getRaw, node, query) {
      return '';
    });
  })
  .concatMap(function(node) {
    return node.replace(topLevelSelector + ' assign.right member > [name=loadDocument]', function(getRaw, node, query) {
      return 'documentLoader';
    });
  })
  .concatMap(function(node) {
    // make sure we don't clobber anything when we "de-property-ize" the public properties
    return node.search(topLevelSelector + ' assign [object.name=' + libraryName + '].property')
      .toArray()
      .map(function(nodes) {
        return _.uniq(
            _.filter(nodes, function(node) {
              return node.name;
            })
            .map(function(node) {
              return node.name;
            })
        )
        .reduce(function(accumulator, publicPropertyName) {
          var publicPropertyNameRe = new RegExp('([^jsonld\\.]|^)(' + publicPropertyName + ')(\\W|$)', 'gm');
          return accumulator.replace(publicPropertyNameRe, '$1_esnextifiedPrivate' + publicPropertyName + '$3');
        }, node.source);
      })
      /*
      .concatMap(function(nodes) {
        var publicPropertyNames = _.uniq(
            _.filter(nodes, function(node) {
              return node.name;
            })
            .map(function(node) {
              return node.name;
            })
        );
        console.log('publicPropertyNames');
        console.log(publicPropertyNames);

        var publicPropertyNameFinderString = publicPropertyNames.map(function(publicPropertyName) {
          //'var-decs! > var-dec[id=#' + publicPropertyName + '],'
          return 'func-exp [id=#' + publicPropertyName + '].id,' +
            '[callee] > [name=' + publicPropertyName + '],' +
            'assign [object.name=' + publicPropertyName + '].object,' +
            'assign > [name=' + publicPropertyName + ']';
        })
        .join(',');

        console.log('publicPropertyNameFinderString');
        console.log(publicPropertyNameFinderString);
        return node.replace(publicPropertyNameFinderString, function(getRaw, node, query) {
          return '_esnextifiedPrivate' + node.name;
        });
      });
      //*/
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
        var moduleElementsByModule = _.reduce(nodes, function(accumulator, node) {
          if (node.type === 'VariableDeclarator') {
            console.log('node');
            console.log(node);
          }
          var moduleAndExportNames = getModuleAndExportNames(node);
          var moduleName = moduleAndExportNames.moduleName;
          var exportName = moduleAndExportNames.exportName;
          accumulator[moduleName] = accumulator[moduleName] || [];
          var moduleElements = accumulator[moduleName];
          var exportedElement = _.find(moduleElements, function(element) {
            return element.exportName === exportName;
          });

          if (!exportedElement) {
            moduleElements.push({
              moduleName: moduleName,
              exportName: exportName,
              source: node.source
            });
          } else {
            exportedElement.source += '\n' + node.source + '\n';
          }

          return accumulator;
        }, {});

        //*
        var moduleAndExportNames = _.toPairs(moduleElementsByModule)
          .map(function(pair) {
            var result = {};
            result[pair[0]] = pair[1].map(function(item) {
              return item.exportName;
            });
            return result;
          });
        console.log('moduleAndExportNames');
        console.log(moduleAndExportNames);
        //*/

        /*
        var reSelectors = _.uniq(
          _.toPairs(moduleElementsByModule)
            .reduce(function(accumulator, pair) {
              var moduleName = pair[0];
              var exportNames = pair[1].map(function(item) {
                return item.exportName;
              });
              return accumulator.concat(exportNames.map(function(exportName) {
                if (!exportName) {
                  return '(\\W|^)(' + moduleName + ')(\\W|$)';
                } else {
                  return '(\\W|^)(' + moduleName + '\\.' + exportName + ')(\\W|$)';
                }
              }));
            }, [])
        );
        //*/

        /*
        var graspSelectors = _.uniq(
          _.toPairs(moduleElementsByModule)
            .reduce(function(accumulator, pair) {
              var moduleName = pair[0];
              var exportNames = pair[1].map(function(item) {
                return item.exportName;
              });
              return accumulator.concat(exportNames.map(function(exportName) {
                if (!exportName) {
                  return '#' + moduleName
                } else {
                  return '[object.name=' + moduleName + '] [property.name=' + exportName + ']'
                }
              }));
            }, [])
        );
        console.log('graspSelectors');
        console.log(graspSelectors);
        var selectorFinderString = graspSelectors.join(',');
        //*/

        var sourcesByModule = _.toPairs(moduleElementsByModule)
          .reduce(function(accumulator, pair) {
            var moduleName = pair[0];
            var moduleElements = pair[1];
            if (moduleName === libraryName) {
              accumulator[moduleName] = moduleElements
                .map(function(moduleElement) {
                  var exportName = moduleElement.exportName;
                  var source = moduleElement.source;
                  if (moduleElements.length === 1) {
                    return 'export default ' + source;
                  } else {
                    if (!exportName) {
                      return '\n' + source + '\n';
                    } else {
                      return source + '\n' + 'export var ' + exportName + ' = ' + moduleName + '.' + exportName + ';\n';
                    }
                  }
                })
                .join('\n');
            } else {
              accumulator[moduleName] = moduleElements
                .map(function(moduleElement) {
                  return moduleElement.source;
                })
                .join('\n') + '\n\nexport default ' + moduleName + ';';
            }
            return accumulator;
          }, {});

        //return Rx.Observable.return([{source: ''}]);
        var moduleNames = _.keys(moduleElementsByModule);
        return Rx.Observable.pairs(sourcesByModule)
          .concatMap(function(pair) {
            var moduleName = pair[0];
            var source = pair[1];

            /*
            return Rx.Observable.from(moduleAndExportNames)
              .concatMap(function(moduleElement) {
                return Rx.Observable.pairs(moduleElement)
              })
              .filter(function(pair) {
                return pair[0] !== moduleName;
              })
              .reduce(function(accumulator, pair) {
                var iteratorModuleName = pair[0];
                var exportNames = pair[1];
                console.log('exportNames');
                console.log(exportNames);
                var re;
                return exportNames.reduce(function(subAccumulator, exportName) {
                  if (!exportName) {
                    re = new RegExp('(\\W|^)(' + iteratorModuleName + ')(\\W|$)', 'gm');
                    if (re.test(source)) {
                      return 'import ' + iteratorModuleName + ' from \'./' + iteratorModuleName + '\';\n' + subAccumulator;
                    } else {
                      return subAccumulator;
                    }
                  } else {
                    re = new RegExp('(\\W|^)(' + iteratorModuleName + '\\.' + exportName + ')(\\W|$)', 'gm');
                    if (re.test(source)) {
                      return 'import * as ' + exportName + ' from \'./' + iteratorModuleName + '\';\n' + subAccumulator;
                      //return 'import {' + exportName + '} as ' + exportName + ' from \'./' + iteratorModuleName + '\';\n' + subAccumulator;
                      //return 'import {' + exportName + '} from \'./' + iteratorModuleName + '\';\n' + subAccumulator;
                    } else {
                      return subAccumulator;
                    }
                  }
                }, accumulator);
              }, source)
              .map(function(updateSource) {
                return {
                  moduleName: moduleName,
                  source: updateSource
                };
              });
              //*/

            //*
            return Rx.Observable.from(moduleNames)
              .filter(function(iteratorModuleName) {
                return iteratorModuleName !== moduleName;
              })
              .reduce(function(accumulator, iteratorModuleName) {
                var re = new RegExp('(\\W|^)(' + iteratorModuleName + ')(\\W|$)', 'gm');
                if (re.test(source)) {
                  if (iteratorModuleName === libraryName) {
                    return 'import * as ' + iteratorModuleName + ' from \'./' + iteratorModuleName + '\';\n' + accumulator;
                  } else {
                    return 'import ' + iteratorModuleName + ' from \'./' + iteratorModuleName + '\';\n' + accumulator;
                  }
                } else {
                  return accumulator
                }
              }, source)
              .map(function(updateSource) {
                return {
                  moduleName: moduleName,
                  source: updateSource
                };
              });
            //*/

            /*
            return rxGrasp(source).replace(selectorFinderString, function(getRaw, node, query) {
                var moduleAndExportNames = getModuleAndExportNames(node);
                var moduleName = moduleAndExportNames.moduleName;
                var exportName = moduleAndExportNames.exportName;
                return 'import ' + exportName + ' from \'./' + moduleName + '\';\n' + node.source;
              })
              .map(function(node) {
              return node.source;
              });
            //*/
          });
      })
  })
  .toArray()
  .subscribe(function(outputs) {
    //console.log(outputString);
    //console.log('^outputString173');
    outputs.forEach(function(output) {
      var moduleName = output.moduleName;
      var source = output.source;
      var destPath = path.join(__dirname, '..', 'dist', version, moduleName + '.js');
      fs.writeFileSync(destPath, source, {encoding: 'utf8'});
    });

    var oneOutputString = outputs.map(function(output) {
      return output.source;
    })
    .join('\n\n\n\\\\break\n\n\n\n\n');
    fs.writeFileSync('./output.js', oneOutputString, {encoding: 'utf8'});
  }, function(err) {
    throw err;
  }, function() {
    console.log('Build completed');
  });

/*
rxGrasp(sourceString).replace('exp-statement![expression.left.object.name=' + libraryName + ']', function(getRaw, node, query) {
    var propertyName = node.expression.left.property.name;
    var methodName = strcase.camelCase(libraryName + '.' + propertyName);
    return 'import ' + methodName + ' from \'./' + methodName + '\';';
  })
  .map(function(node) {
    return node.source;
  })
  .subscribe(function(outputString) {
    console.log(outputString);
    console.log('^outputString173');
    var destPath = path.join(__dirname, '..', 'dist', libraryName + '.esnext.js');
    //fs.writeFileSync(destPath, outputString, {encoding: 'utf8'});
  }, function(err) {
    throw err;
  }, function() {
    console.log('Build completed');
  });
//*/

// grasp 'exp-statement![expression.left.object.name=jsonld]' --replace '{{ assign[left.object.name=jsonld].right | join | prepend "export default " }}' ./node_modules/jsonld/js/jsonld.js --to testit.js
// grasp 'exp-statement![expression.left.object.name=jsonld]' ./node_modules/jsonld/js/jsonld.js
// grasp 'assign![left.object.name=jsonld][left.object.object.name=jsonld][left.object.object.object.name=jsonld]' ./node_modules/jsonld/js/jsonld.js
// grasp 'assign![left.object.object.object.name=jsonld]' ./node_modules/jsonld/js/jsonld.js
// grasp 'assign![left.object.object.name=jsonld]' ./node_modules/jsonld/js/jsonld.js
// grasp 'assign![left.object.name=jsonld]assign![left.object.object.name=jsonld],assign![left.object.object.object.name=jsonld]' ./node_modules/jsonld/js/jsonld.js
// grasp 'assign![left.object.name=jsonld],assign![left.object.object.name=jsonld],assign![left.object.object.object.name=jsonld]' --replace '{{ assign[left.object.name=jsonld].right,assign[left.object.object.name=jsonld].right,assign[left.object.object.object.name=jsonld].right | join | prepend "export default " }}' ./node_modules/jsonld/js/jsonld.js --to testit.js
// grasp '(assign[left.object.name=jsonld],assign[left.object.object.name=jsonld],assign[left.object.object.object.name=jsonld]).left' ./node_modules/jsonld/js/jsonld.js
//
// grasp 'exp-statement.expression.left[object.name=jsonld],exp-statement.expression.left[object.object.name=jsonld],exp-statement.expression.left[left.object.object.object.name=jsonld])' ./node_modules/jsonld/js/jsonld.js
// grasp 'exp-statement.expression.left[object.name=jsonld]' ./node_modules/jsonld/js/jsonld.js
// grasp 'exp-statement.expression.left[object.object.name=jsonld]' ./node_modules/jsonld/js/jsonld.js
// grasp 'exp-statement.expression.left[object.object.object.name=jsonld]' ./node_modules/jsonld/js/jsonld.js
//
// grasp 'exp-statement.expression.left([object.name=jsonld],[object.object.name=jsonld],[object.object.object.name=jsonld])' ./node_modules/jsonld/js/jsonld.js
// grasp 'exp-statement.expression.left [name=jsonld]' ./node_modules/jsonld/js/jsonld.js
//
// grasp 'assign.left! [name=jsonld]' ./node_modules/jsonld/js/jsonld.js
//
// grasp 'var-decs[name=jsonldActiveContextCache]' ./dist/jsonldActiveContextCache.js
// grasp 'var-decs! > * > #jsonldActiveContextCache,exp-statement! > assign [left.name=jsonldActiveContextCache]' ./dist/jsonldActiveContextCache.js
//
// grasp 'var-decs! > * > #jsonldActiveContextCache,exp-statement! > assign > * > * > #jsonldActiveContextCache' ./dist/jsonldActiveContextCache.js
// grasp '* > [left.name=jsonldActiveContextCache]' ./dist/jsonldActiveContextCache.js
//
// grasp 'exp-statement! > * > assign.left [object.name=jsonldActiveContextCache]' ./dist/jsonldActiveContextCache.js
// grasp 'var-decs! > * > #jsonldActiveContextCache,exp-statement! > * > assign.left [object.name=jsonldActiveContextCache]' ./dist/jsonldActiveContextCache.js
// grasp 'assign.left! ([name=jsonld],[name=Processor])' ./dist/tester.js
// grasp ':root > var-decs' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > var-decs' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body) > var-decs' ./node_modules/jsonld/js/jsonld.js
// grasp 'exp-statement[id!=#wrapper]' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-decs > var-dec! > :not(#wrapper)' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id!=#wrapper]' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > var-decs > exp-statement > assign' ./node_modules/jsonld/js/jsonld.js
//
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > (exp-statement > assign[left.object.name], exp-statement > func-dec)' ./node_modules/jsonld/js/jsonld.js
//
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > (exp-statement > assign[left.object.name] > assign.left, func-dec)' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > exp-statement > assign[left.object.name] > assign.left,var-dec[id=#wrapper][init=func-exp].init.body > func-dec' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > func-dec' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > exp-statement > assign[left.object.name] > assign.left,var-dec[id=#wrapper][init=func-exp].init.body > func-dec,var-dec[id=#wrapper][init=func-exp].init.body > var-decs > var-dec' ./node_modules/jsonld/js/jsonld.js
//
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body assign.left! [name=jsonld]' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body assign.left! [name=jsonldDocumentLoader]' ./jsonldDocumentLoaderTest.js
// grasp '#compact' ./node_modules/jsonld/js/jsonld.js
//
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > exp-statement! > assign[left.object.name=jsonld][left.property.name=documentLoader]' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > exp-statement! > assign[left.object.name=jsonld][left.property.name=documentLoaders]' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > exp-statement! assign[left.object.name=jsonld][left.property.name=documentLoaders]' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body #documentLoaders' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > exp-statement! > assign[left.object.name=jsonld][left.property.name=documentLoaders]' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > exp-statement! > assign > assign.left [name=documentLoaders]' ./node_modules/jsonld/js/jsonld.js
//
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > exp-statement! > assign[left.object.name=jsonld] > assign ([left.object.name=documentLoaders],[left.property.name=documentLoaders])' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > exp-statement! [left.object.name=documentLoaders]' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > exp-statement! > assign[left.object.name=jsonld][left.property.name=loadDocument]' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > member! > [name=jsonld]' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > member! > [name=jsonld] > assign[left.object.name=jsonld][left.property.name=loadDocument]' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > member! > [name=IdentifierIssuer]' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > member! > [name=IdentifierIssuer]' ./node_modules/jsonld/js/jsonld.js
//
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > exp-statement' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > [object.name=Processor] [property.name=expand]' ./node_modules/jsonld/js/jsonld.js
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > exp-statement #Processor' ./node_modules/jsonld/js/jsonld.js
// grasp '#_removeEmbed' ./node_modules/jsonld/js/jsonld.js
//
// grasp 'var-dec[id=#wrapper][init=func-exp].init.body > var-decs! > var-dec' ./node_modules/jsonld/js/jsonld.js
//
// rollup -c -o ./bundle.js
