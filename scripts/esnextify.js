/*
 * 1) Create one module for each function that exists at the same level as the main export
 *    or higher.
 * 2) Create a single module with all the "const" or "var" or "let" declarations that have as values
 *    literals or combinations of literals and that exist at the same level as the main export or
 *    higher (trying to capture all top-level constant declarations).
 * 3) For every created module, import its dependencies.
 * 4) Create a main module that exports every public item (functions, variables, etc.),
 */

var _ = require('lodash');
var escodegen = require('escodegen');
var fs = require('fs-extra');
var path = require('path');
var Rx = require('rx');
var rxGrasp = require('./rx-grasp-extra.js');
var strcase = require('tower-strcase');

const libraryName = 'jsonld';
const DOT = 'DOT';
const topLevelSelector = 'var-dec[id=#wrapper][init=func-exp].init.body';

const mainModuleName = 'NormalizeHashDOT_init';
const sourcePkgPath = path.join(__dirname, '..', 'node_modules', libraryName, 'package.json');
const sourcePkg = require(sourcePkgPath);
const sourcePath = path.join(__dirname, '..', 'node_modules', libraryName, sourcePkg.main);
const sourceString = fs.readFileSync(sourcePath, {encoding: 'utf8'});

fs.removeSync(path.join(__dirname, '..', 'dist', 'esnext'));
fs.ensureDirSync(path.join(__dirname, '..', 'dist', 'esnext'));

// TODO use rxGrasp to do these two replacements below instead of RegExs
var cleanSourceString = sourceString
      .replace(/var\ http\ \=\ require\('http'\);/g, '')
      .replace(/(^|[^\\-\\w\'\"\\.])(http.STATUS_CODES)(\\W|$)/g, '$1nodeStatusCodes$3');

var replacements = [{
  // Avoid multiple variable declarations, because some code below
  // assumes a single var-dec for each var-decs.
  selector: topLevelSelector + ' var-decs',
  replacer: function(getRaw, node, query) {
    if (node.declarations.length > 1) {
      return node.declarations
      .map(function(declaration) {
        var newNode = _.cloneDeep(node);
        newNode.declarations = [declaration];
        return escodegen.generate(newNode);
      })
      .join('\n')
    }
    return getRaw(node);
  }
}, {
  selector: topLevelSelector + ' var-decs! > var-dec > (' +
      '[name=_delay],' +
      '[name=_setImmediate]' +
    ')',
  replacer: function(getRaw, node, query) {
    return '';
  }
}, {
  selector: topLevelSelector + ' assign! > [object.name=jsonld][property.name=setImmediate]',
  replacer: function(getRaw, node, query) {
    return '';
  }
}, {
  selector: topLevelSelector + ' [callee] > (' +
      '[object.name=jsonld][property.name=setImmediate],' +
      '[object.name=jsonld][property.name=nextTick]' +
    ')',
  replacer: function(getRaw, node, query) {
    return 'setImmediate';
  }
}, {
  selector: topLevelSelector + ' IfStatement! > ' +
    'IfStatement.test [object.name=jsonld][property.name=Promise]',
  replacer: function(getRaw, node, query) {
    return '';
  }
}, {
  // TODO this is a loose selector. should make it more specific for safety.
  selector: topLevelSelector + ' TryStatement! #Promise',
  replacer: function(getRaw, node, query) {
    return '';
  }
}, {
  selector: topLevelSelector + ' [object.name=jsonld][property.name=Promise]',
  replacer: function(getRaw, node, query) {
    return 'Promise';
  }
}, {
  selector: topLevelSelector + ' > ' +
    'exp-statement![expression.left.object.name=jsonld][expression.left.property.name=objectify]',
  replacer: function(getRaw, node, query) {
    return '';
  }
}, {
  selector: topLevelSelector + ' > exp-statement > assign > assign.right! > prop > [name=simple]',
  replacer: function(getRaw, node, query) {
    node.properties = node.properties.filter(function(property) {
      return property.key.name !== 'simple';
    });
    return escodegen.generate(node);
  }
}, {
  selector: topLevelSelector + ' > exp-statement! > AssignmentExpression #DocumentCache',
  replacer: function(getRaw, node, query) {
    return '';
  }
/*
}, {
  selector: topLevelSelector + ' > exp-statement! > ' +
    'assign[left.object.name=' + libraryName + '][left.property.name=documentLoader]',
  replacer: function(getRaw, node, query) {
    //var newText = 'documentLoaderCreator()';
    //var newText = '';
    var newText = 'jsonldDOTdocumentLoader';
    return newText;
  }
//*/
}, {
  selector: topLevelSelector + ' > exp-statement! > assign > assign.left [name=documentLoaders]',
  replacer: function(getRaw, node, query) {
    return '';
  }
}, {
  selector: topLevelSelector + ' > exp-statement! > ' +
    'assign[left.object.name=' + libraryName + '][left.property.name=useDocumentLoader]',
  replacer: function(getRaw, node, query) {
    return '';
  }
}, {
  selector: topLevelSelector + ' > exp-statement! > ' +
    'assign[left.object.name=' + libraryName + '][left.property.name=loadDocument]',
  replacer: function(getRaw, node, query) {
    return '';
  }
}, {
  selector: topLevelSelector + ' assign.right member > [name=loadDocument]',
  replacer: function(getRaw, node, query) {
    return 'documentLoader';
  }
}, {
  selector: 'var-decs! > var-dec > #_browser,' +
    'IfStatement! > IfStatement.test [name=_browser],' +
    'IfStatement! > IfStatement.test[name=_browser],' +
    'IfStatement! > IfStatement.test[left.name=_browser]',
  replacer: function(getRaw, node, query) {
    return '';
  }
//*
}, {
  //selector: topLevelSelector + ' IfStatement! #crypto',
  selector: 'IfStatement! #crypto',
  replacer: function(getRaw, node, query) {
    var chunks = getRaw(node).split('\n').slice(1, -2);
    var result = [
      'import {NormalizeHash} from \'./NormalizeHash.js\'',
      '(function() {'
    ]
    .concat(chunks)
    .concat([
      '}());'
    ])
    .join('\n');
    // NOTE: this is a side effect that may cause confusion.
    // There is some related code that runs in the .subscribe section below;
    fs.outputFileSync('./dist/esnext/' + mainModuleName + '.node.js', result, {encoding: 'utf8'});
    return '';
  }
//*/
}, {
  selector: 'var-decs! > var-dec > #_nodejs,' +
    'IfStatement! > IfStatement.test [name=_nodejs],' +
    'IfStatement! > IfStatement.test[name=_nodejs],' +
    'IfStatement! > IfStatement.test[left.name=_nodejs]',
  replacer: function(getRaw, node, query) {
    return '';
  }
}];

var firstReplacement = replacements[0];
var firstNode = rxGrasp(cleanSourceString).replace(
  firstReplacement.selector, firstReplacement.replacer);
return Rx.Observable.from(replacements.slice(1))
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
        var destPath = path.join(
            __dirname, '..', 'dist', 'esnext', 'node-polyfills.js');
        console.log('nodePolyfillString');
        console.log(nodePolyfillString);
        fs.outputFileSync(destPath, nodePolyfillString, {encoding: 'utf8'});
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
    //fs.outputFileSync('./output.js', nodeSource, {encoding: 'utf8'});
    var literalVarDecSearchString = [
      topLevelSelector + ' > var-decs! > (' +
        'var-dec[init=Literal],' +
        'var-dec![init=BinaryExpression] > (' +
          '[left=Identifier][right=Literal],' +
          '[left=Literal][right=Identifier]' +
        ')' +
      ')',
    ]
    .join(',');

    var moduleCandidatesSearchStrings = [
      topLevelSelector + ' > exp-statement',
      topLevelSelector + ' > func-dec',
      //topLevelSelector + ' > var-decs! > var-dec',
      topLevelSelector + ' > var-decs! > (' +
        'var-dec[init=:not(Literal)][init=:not(BinaryExpression)],' +
        'var-dec![init=BinaryExpression] > ([left=:not(Identifier)][left=:not(Literal)],' +
        '[right=:not(Literal)][right=:not(Identifier)])' +
      ')',
    ];
    var moduleCandidatesSearchString = moduleCandidatesSearchStrings.join(',');

    return Rx.Observable.zip(
      rxGrasp(nodeSource).search(literalVarDecSearchString)
        .toArray(),
      rxGrasp(nodeSource).search(moduleCandidatesSearchString)
        .toArray()
      )
      .concatMap(function(zipped) {
        var literalVarDecNodes = zipped[0];
        var nodes = zipped[1];

        var literalVarDecNames = literalVarDecNodes
          .map(function(node) {
            return node.declarations[0].id.name;
          });

        var literalVarDecSources = literalVarDecNodes
          .map(function(node) {
            return node.source;
          });

        var literalVarDecsCode = literalVarDecSources
          .map(function(nodeSource) {
            return nodeSource.replace('var ', 'export const ');
          })
          .join('');
        var literalVarDecsCodePath = path.join('./dist/esnext/literalVarDecs.js');
        fs.outputFileSync(literalVarDecsCodePath, literalVarDecsCode, {encoding: 'utf8'});

        var elementsGroupedByFirstName = _.reduce(nodes, function(accumulator, node) {
          var firstAndSecondNames = rxGrasp.getFirstAndSecondNames(node, mainModuleName);
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

        console.log('firstAndSecondNames');
        console.log(firstAndSecondNames);

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
                var reInput = '(\\W|^)(' + iteratorModuleItem.first + '\\.' +
                  iteratorModuleItem.second + ')(\\W|$)';
                var re = new RegExp(reInput, 'gm');
                return accumulator.replace(re, '$1' + iteratorModuleItem.moduleName + '$3');
              }, source);

            if (source.indexOf('var ' + moduleName) > -1) {
              source = source.replace('var ' + moduleName, 'export const ' + moduleName)
            } else if (source.indexOf('const ' + moduleName) > -1) {
              source = source.replace('const ' + moduleName, 'export const ' + moduleName)
            } else if (source.indexOf('function ' + moduleName) > -1) {
              source = source.replace('function ' + moduleName,
                'export const ' + moduleName + ' = function')
            } else if (source.indexOf(moduleName) > -1) {
              source = 'export const ' + source;
            } else {
              source += '\nexport const ' + moduleName + ' = ' + moduleName + ';';
            }

            var literalVarDecNamesString = literalVarDecNames
              .filter(function(name) {
                var re = new RegExp('\\b' + name + '\\b');
                return re.test(source);
              })
              .join(',');

            if (literalVarDecNamesString) {
              source = 'import {' + literalVarDecNamesString + '} from \'./literalVarDecs\';\n' +
                source;
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
                  return 'import {' + iteratorModuleName + '} from \'./' +
                    iteratorModuleName + '\';\n' + accumulator;
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
    // NOTE: we already have defined our own new jsonldDOTdocumentLoader, so we discard the old one.
    if (output.moduleName !== 'jsonldDOTdocumentLoader') {
      var moduleName = output.moduleName;
      var source = output.source;
      var destPath = path.join(__dirname, '..', 'dist', 'esnext', moduleName + '.js');
      fs.outputFileSync(destPath, source, {encoding: 'utf8'});
    }
  })
  .toArray()
  .doOnNext(function(outputs) {
    var libraryFile = 'import \'./' + mainModuleName + '.js\';\n' +
      outputs.filter(function(output) {
        return output.first === libraryName;
      })
      .map(function(output) {
        return 'import {' + output.moduleName + '} from \'./' + output.moduleName + '\';\n' +
          'export const ' + output.second + ' = ' + output.moduleName + ';';
      })
      .join('\n');

    var destPath = path.join(__dirname, '..', 'dist', 'esnext', libraryName + '.js');
    fs.outputFileSync(destPath, libraryFile, {encoding: 'utf8'});
  })
  .subscribe(function(outputs) {
    /*
    var oneOutputString = outputs.map(function(output) {
      return output.source;
    })
    .join('\n\n\n\\\\*********** EOF ***********\n\n\n\n\n');
    fs.outputFileSync('./output.js', oneOutputString, {encoding: 'utf8'});
    //*/
  }, function(err) {
    throw err;
  }, function() {
    var first = './dist/esnext/' + mainModuleName + '.js';
    var second = './dist/esnext/' + mainModuleName + '.browser.js';
    fs.move(first, second, function(err) {
      if (err) {
        return console.error(err);
      }
      var third = './dist/esnext/' + mainModuleName + '.node.js';
      var fourth = './dist/esnext/' + mainModuleName + '.js';
      fs.move(third, fourth, function(err) {
        if (err) {
          return console.error(err);
        }
        console.log('esnextify completed');
      });
    });
  });
