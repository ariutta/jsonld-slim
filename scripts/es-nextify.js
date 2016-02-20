var _ = require('lodash');
var falafel = require('falafel');
var fs = require('fs');
var grasp = require('grasp');
var path = require('path');
var Rx = require('rx');
var strcase = require('tower-strcase');

var version = 'dev';

function falafelRx(code, opts) {
  opts = opts || {};
  var subject = new Rx.ReplaySubject();
  var result = falafel(code, opts, function(node) {
    subject.onNext(node);
    if (node.type === 'Program') {
      subject.onCompleted();
    }
  });
  return subject;
}

var beforeString = fs.readFileSync(path.join(__dirname, '..', 'lib', 'before.js'));
var afterString = fs.readFileSync(path.join(__dirname, '..', 'lib', 'after.js'));

var neededFunctions = [
  'wrapper',
];
var sourcePath = path.join(__dirname, '..', 'node_modules', 'jsonld', 'js', 'jsonld.js');
var sourceString = fs.readFileSync(sourcePath, {encoding: 'utf8'});
/*
falafelRx(sourceString)
  .filter(function(node) {
    //grasp '[test =#_nodejs]' ./node_modules/jsonld/js/jsonld.js
    if (node.test && node.test.name === '_nodejs') {
      return false;
    }

    //grasp 'var-dec[id=#wrapper][init=func-exp].init.body>*' ./node_modules/jsonld/js/jsonld.js
    return node.id && (node.id.name === 'wrapper') && node.init && node.init.body &&
      node.init.type === 'FunctionExpression' && node.init.body.body;
  })
  .reduce(function(accumulator, node) {
    accumulator = accumulator.concat(
      node.init.body.body
        .filter(function(item) {
          //console.log('**********************************');
          //console.log(item.source());
          if (item.argument && item.argument.name === 'jsonld') {
            return false;
          }

          if (item.test && item.test.name === '_nodejs') {
            return false;
          }

          if (item.expression && item.expression.callee) {
            var callee = item.expression.callee;
            if (callee.object && callee.object.name === 'jsonld' &&
                callee.property && callee.property.name === 'promises') {
              return false;
            }
          }

          if (item.expression && item.expression.left) {
            var left = item.expression.left;

            if (left.object && left.object.name === 'jsonld' &&
                left.property && left.property.name === 'promises') {
              return false;
            }
            if (left.object && left.object.object && left.object.object.object &&
                left.object.object.object.name === 'jsonld' &&
                left.object.object.property &&
                left.object.object.property.name === 'promises') {
              return false;
            }

            if (left.object && left.object.name === 'jsonld' &&
                left.property && left.property.name === 'RequestQueue') {
              return false;
            }
            if (left.object && left.object.object && left.object.object.object &&
                left.object.object.object.name === 'jsonld' &&
                left.object.object.property &&
                left.object.object.property.name === 'RequestQueue') {
              return false;
            }
            if (left.object && left.object.name === 'jsonld' &&
                left.property && left.property.name === 'promisify') {
              return false;
            }
            if (left.object && left.object.name === 'JsonLdProcessor' &&
                left.property && left.property.name === 'prototype') {
              return false;
            }

            if (left.object && left.object.object &&
                left.object.object.name === 'jsonld' &&
                left.object.property &&
                left.object.property.name === 'documentLoaders'
//                left.object.property.name === 'documentLoaders' &&
//                left.property &&
//                (left.property.name === 'jquery' ||
//                  left.property.name === 'xhr')
                ) {
              return false;
            }
            if (left.object && left.object.name === 'jsonld' &&
                left.property && left.property.name === 'documentLoaders') {
              return false;
            }
            if (left.object && left.object.name === 'jsonld' &&
                left.property && left.property.name === 'useDocumentLoader') {
              return false;
            }
            if (left.object && left.object.name === 'jsonld' &&
                left.property && left.property.name === 'documentLoader') {
              return false;
            }
            if (left.object && left.object.name === 'jsonld' &&
                left.property && left.property.name === 'loadDocument') {
              return false;
            }
          }
          return item.source;
        })
        .map(function(item) {
          return item.source();
        })
    );

    return accumulator;
  }, [])
  .map(function(chunks) {
    return chunks.join('\n')
  })
  .map(function(outputString) {
    return outputString.replace(/var\ promise\ =\ /g, '');
      //.replace(/jsonld\.documentLoaders\.node/g, 'jsonld.documentLoaderCreator')
      //.replace(/var\ http\ \=\ require\('http'\);/g, '')
      //.replace(/http.STATUS_CODES/g, 'nodeStatusCodes');
  })
  .map(function(outputString) {
    return grasp.replace('squery', 'if!.test #promise', ' ', outputString);
  })
  .map(function(outputString) {
    return grasp.replace('squery', 'Statement! > AssignmentExpression #DocumentCache', ' ', outputString);
  })
  .map(function(outputString) {
    return grasp.replace('squery',
        'exp-statement!' +
            '[expression.left.object.name=jsonld][expression.left.property.name=objectify]',
        ' ',
        outputString);
  })
  // TODO
  .map(function(outputString) {
    return grasp.replace('squery',
        'member[object.name=jsonld].property[name=loadDocument]',
        'documentLoader',
        outputString);
  })
  .map(function(jsonldString) {
    return [beforeString, jsonldString, afterString].join('\n\n');
  })
//*/

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
  //*
  if (replacement) {
    if (typeof replacement === 'function') {
      args.replaceFunc = replacement;
    } else {
      args.replace = replacement;
    }
    //args.push(replacement);
  } else {
    //args.json = true;
  }
  //*/
  
  var subject = new Rx.ReplaySubject();

  grasp({
    args: args,
    input: source,
    /*
    callback: function(result) {
      console.log(result);
      console.log('^result');
      console.log('result.length');
      console.log(result.length);
      if (typeof result === 'string') {
        return subject.onNext(result);
      } else {
        JSON.parse(result).forEach(function(item) {
          console.log('item.length');
          console.log(item.length);
          subject.onNext(item);
        });
      }
    },
    //*/
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

// find all publicly available methods, e.g., jsonld.compact
// rename "jsonld.compact =" in source to "var jsonldCompact ="
// rename jsonld.compact everywhere else in source to jsonldCompact
// split out jsonldCompact into its own file and append "export default jsonldCompact"
// any modules that depend on jsonldCompact need to import it
//
// do the same for Processor.prototype, e.g., "Processor.prototype.compact" and "Processor().compact"
// do similar for top-level methods, e.g., "_getInitialContext"

function getModuleName(node) {
  if (node && node.object && node.property) {
    var objectName = node.object.name;
    var propertyName = node.property.name;
    var name = strcase.camelCase(objectName + '.' + propertyName);
    return name;
  } else if (node.id && node.id.name) {
    return node.id.name;
  } else {
    console.log('node');
    console.log(node);
    throw new Error('getModuleName');
  }
}

//rxGrasp(sourceString).search('assign.left! [name=jsonld],var-dec[id=#wrapper][init=func-exp].init.body > var-decs > var-dec')
var firstSearchString = 'var-dec[id=#wrapper][init=func-exp].init.body > exp-statement > assign[left.object.name] > assign.left,' +
    'var-dec[id=#wrapper][init=func-exp].init.body > func-dec,' +
    'var-dec[id=#wrapper][init=func-exp].init.body > var-decs > var-dec'
rxGrasp(sourceString).search(firstSearchString)
  .toArray()
  .concatMap(function(nodes) {
    var moduleNames = _.uniq(
        _.map(nodes, getModuleName)
    );

    var prefixNames = _.uniq(
        _.filter(nodes, function(node) {
          return node.object && node.object.name;
        })
        .map(function(node) {
          return node.object.name;
        })
    );

    console.log('prefixNames');
    console.log(prefixNames);

    console.log('moduleNames');
    console.log(moduleNames);

    return rxGrasp(sourceString).replace('var-dec[id=#wrapper][init=func-exp].init.body > exp-statement > assign[left.object.name] > assign.left', function(getRaw, node, query) {
        return 'var ' + getModuleName(node);
      })
      .last()
      .concatMap(function(node) {
        //return rxGrasp(node.source).replace('member! > ([name=jsonld],[name=Processor])', function(getRaw, node, query) {
        return rxGrasp(node.source).replace('member! > [name=jsonld]', function(getRaw, node, query) {
            return getModuleName(node);
          });
      })
      .concatMap(function(node) {
        return rxGrasp(node.source).replace('var-decs! > var-dec[id=#jsonldDocumentLoader]', function(getRaw, node, query) {
            var newText = fs.readFileSync(__dirname + '/../lib/jsonldDocumentLoader.js', {encoding: 'utf8'});
            return newText;
          });
      })
      .concatMap(function(node) {
        return rxGrasp(node.source).replace('exp-statement! > assign #jsonldDocumentLoader', function(getRaw, node, query) {
            return '';
          });
      })
      .doOnNext(function(node) {
        moduleNames
          .forEach(function(currentModuleName) {
            var currentModuleSearchString = 'var-decs! > var-dec[id=#' + currentModuleName + '],' +
                'var-dec[id=#wrapper][init=func-exp].init.body > exp-statement! > assign[left.object.name=' + currentModuleName + '],' +
                'func-dec[id=#' + currentModuleName + '],' +
                'var-dec[id=#wrapper][init=func-exp].init.body > exp-statement! > assign [object.name=' + currentModuleName + ']'
            rxGrasp(node.source).search(currentModuleSearchString)
              .filter(function(currentModuleNode) {
                return !!currentModuleNode && !!currentModuleNode.source;
              })
              .map(function(currentModuleNode) {
                return currentModuleNode.source;
              })
              .toArray()
              .subscribe(function(result) {
                var bodyString = result.join('\n');

                var importSection = moduleNames
                  .filter(function(moduleName) {
                    return moduleName !== currentModuleName;
                  })
                  .filter(function(moduleName) {
                    return bodyString.indexOf(moduleName) > -1;
                  })
                  .map(function(importedModuleName) {
                    //return 'import ' + importedModuleName + ' from \'./' + importedModuleName + '\';';
                    return 'import {' + importedModuleName + '} from \'./' + importedModuleName + '\';';
                  });

                var exportSection = [];
                if (bodyString.indexOf('var ' + currentModuleName) > -1) {
                  bodyString = bodyString.replace('var ' + currentModuleName, 'export const ' + currentModuleName)
                } else if (bodyString.indexOf('const ' + currentModuleName) > -1) {
                  bodyString = bodyString.replace('const ' + currentModuleName, 'export const ' + currentModuleName)
                } else if (bodyString.indexOf('function ' + currentModuleName) > -1) {
                  bodyString = bodyString.replace('function ' + currentModuleName, 'export const ' + currentModuleName + ' = function')
                } else {
                  exportSection.push('export const ' + currentModuleName + ' = ' + currentModuleName + ';');
                }
                //var moduleString = importSection.concat([bodyString]).concat(['export default ' + currentModuleName + ';']).join('\n');
                var moduleString = importSection.concat([bodyString]).concat(exportSection).join('\n');

                fs.writeFileSync('./dist/' + version + '/' + currentModuleName + '.js', moduleString, {encoding: 'utf8'});
              }, function(err) {throw err;});
          });
      });
  })
//  .doOnCompleted(function() {
//
//  })
////rxGrasp(sourceString).replace('exp-statement![expression.left.object.name=jsonld]', 'var a = 1;')
////rxGrasp(sourceString).replace('#factory', 'wee')
//  //*
//  .concatMap(function(node) {
//    return node.replace('assign.left! > [name=jsonld]', function(getRaw, node, query) {
//        var propertyName = node.property.name;
//        var methodName = strcase.camelCase('jsonld.' + propertyName);
//        return 'var ' + methodName + ' = ';
//      });
//  })
//  .doOnNext(function(nodes) {
//    var replaced = '';
//    Rx.Observable.from(_.uniq(
//        _.map(nodes, function(node) {
//          return node.property.name;
//        })
//    ))
//    .concatMap(function(propertyName) {
//      console.log('propertyName');
//      console.log(propertyName);
//      //return propertyName;
//      rxGrasp(sourceString).replace('assign.left! > [name=jsonld]', function(getRaw, node, query) {
//          var propertyName = node.property.name;
//          var methodName = strcase.camelCase('jsonld.' + propertyName);
//          return 'var ' + methodName + ' = ';
//        })
//        .subscribe(function(result) {
//          console.log('result');
//          console.log(result);
//        }, function(err) {throw err;});
//    });
//  })
  //*/
  /*
  .concatMap(function(node) {
    console.log('node');
    console.log(node);
    //return node.search('#version');
    return node.replace('#version', 'wee');
  })
  //*/
  //*
  //*/
  .map(function(node) {
    return node.source;
  })
  .subscribe(function(outputString) {
    //console.log(outputString);
    //console.log('^outputString173');
    var destPath = path.join(__dirname, '..', 'dist', 'jsonld.esnext.js');
    //fs.writeFileSync(destPath, outputString, {encoding: 'utf8'});
  }, function(err) {
    throw err;
  }, function() {
    console.log('Build completed');
  });

/*
rxGrasp(sourceString).replace('exp-statement![expression.left.object.name=jsonld]', function(getRaw, node, query) {
    var propertyName = node.expression.left.property.name;
    var methodName = strcase.camelCase('jsonld.' + propertyName);
    return 'import ' + methodName + ' from \'./' + methodName + '\';';
  })
  .map(function(node) {
    return node.source;
  })
  .subscribe(function(outputString) {
    console.log(outputString);
    console.log('^outputString173');
    var destPath = path.join(__dirname, '..', 'dist', 'jsonld.esnext.js');
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
//
// rollup -c -o ./bundle.js
