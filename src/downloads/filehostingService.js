var util = require('util'),
  http = require('http'),
  fs = require('fs'),
  url = require('url'),
  path = require('path'),
  utils = require('../utils.js'),
  _ = require('lodash'),
  accepts = require('accepts'),
  config = require('../../config.js');


if (!process.env['CRAWL_DIR']) throw new Error('No CRAWL_DIR variable defined');
if (!fs.existsSync(process.env['CRAWL_DIR'])) throw new Error('Data directory not found: ' + process.env['CRAWL_DIR']);
if (!config.fileHosting.port) throw new Error('No port defined to run  file hosting server on');


if (!process.env['LOG_DIR']) throw new Error("No LOG_DIR variable specified");
if (!fs.existsSync(process.env['LOG_DIR'])) throw new Error("Logging dir (" + process.env['LOG_DIR'] + ") does not exist");



var contentTypes = {
  ntriples: {mediaType: 'application/n-triples', extension: '.nt', gzipped: true},
  nquads: {mediaType: 'application/n-quads', extension: '.nq', gzipped: true},
  hdt: {mediaType: 'application/prs.hdt', extension: '.hdt', gzipped: false}
}
var availableAccepts = [];
for (var cType in contentTypes) {
  availableAccepts = contentTypes[cType].mediaType;
}

/**
 * Run file hosting server
 */




http.createServer(function(req, res) {
  var parsedUrl = url.parse(req.url, true);
  var pathname = path.basename(parsedUrl.pathname);
  var documentDir = null;
  if (pathname.length >= 32) {
    documentDir = process.env['CRAWL_DIR']
      + '/'
      + pathname.substring(0, 2)
      + '/'
      + pathname.substring(2,32);
  }
  var getDocumentFile = function(contentType) {
    if (!documentDir) return null;
    return documentDir + '/clean' + contentType.extension + (contentTypes[cType].gzipped?'.gz':'');
  }

  var contentTypeChecks = [
    function(cb, checksDone) {
      //file extension
      for (var cType in contentTypes) {
        var endsWith = contentTypes[cType].extension + (contentTypes[cType].gzipped?'.gz':'');
        if (_.endsWith(pathname, endsWith)) {
          fs.exists(getDocumentFile(contentTypes[cType]), function(exists){
            if (exists) {
              return cb(null, contentTypes[cType]);
            } else {
              return guessContentTypeForDoc(cb, checksDone+1);
            }
          })

        }
      }
      guessContentTypeForDoc(cb, checksDone+1);
    },
    function(cb, checksDone) {
      //2. check query argument for hdt (for backward compatability)
      if (parsedUrl.query && parsedUrl.query.type && parsedUrl.query.type == "hdt") {
        fs.exists(getDocumentFile(contentTypes.hdt), function(exists) {
          if (exists) {
            return cb(null, contentTypes.hdt);
          } else {
            guessContentTypeForDoc(cb, checksDone+1);
          }
        })
      } else {
        guessContentTypeForDoc(cb, checksDone+1)
      }
    },
    function(cb, checksDone, clientTypesChecked) {
      var checkAccept = this;
      //3 accept headers
      var accept = accepts(req);
      if (clientTypesChecked === undefined) clientTypesChecked = 0;

      var accepted = accept.type(availableAccepts);
      var clientTypes = accept.types();
      for (; clientTypesChecked < clientTypes.length; clientTypesChecked++) {
        //we can serve one of the preferred content types
        if (availableAccepts.indexOf(clientTypes[clientTypesChecked]) >= 0) {
          var preferredContentType = null;
          //get our own content type object for this mediatype
          for (var cType in contentTypes) {
            if (contentType[cType].mediaType == clientTypes[clientTypesChecked]) {
              preferredContentType = contentTypes[cType];
            }
          }
          if (!preferredContentType) continue;
          //check whether this file exists
          return fs.exists(getDocumentFile(preferredContentType), function(exists) {
            if (exists) {
              return cb(null, preferredContentType);
            } else {
              return checkAccept(cb, checksDone, clientTypesChecked)
            }
          })
        }
      }
      //nothing found
      guessContentTypeForDoc(cb, checksDone+1);
    },
    function(cb, checksDone) {
      // var do = getDatasetDir(path.basename(url.pathname));
      //4. use gzipped nt/nq (best guess)
      fs.exists(documentDir, function(datasetDirExists) {
        if (!datasetDirExists) {
          return cb({status: 404, message: 'Dataset not found'});
          // utils.sendReponse(res, 404, 'Dataset not found');
        }
        //ok, dataset directory exists. Does it have a clean file though...
        fs.exists(getDocumentFile(contentTypes.ntriples), function(cleanNtFileExists) {
          if (!cleanNtFileExists) {
              //ah, no nt file! Check for an nq file..
              fs.exists(getDocumentFile(contentTypes.nquads), function(cleanNqFileExists) {
                if (!cleanNqFileExists) {
                  //no nq file AND no nt file..
                  return cb({status: 404, message: 'No cleaned file found for this dataset'});
                } else {
                  return cb(null, contentTypes.nquads);
                }
              });
            } else {
              return cb(null, contentTypes.ntriples);
            }
        });

      });
    }
  ];
  var guessContentTypeForDoc = function(cb, checksDone) {
    if (checksDone === undefined) checksDone = 0;

    if (contentTypeChecks[checksDone]) {
      contentTypeChecks[checksDone](cb, checksDone);
    }
  }
  var setResHeader = function(file, contentType) {
    res.setHeader('Content-Disposition', 'attachment;filename=' + pathname + contentType.extension + (contentType.gzipped? '.gz': ''));
    res.setHeader('Content-Type', contentType.mediaType);
    if (contentType.gzipped) res.setHeader('Content-Encoding', "gzip");
    res.writeHead(200);
  }
  var sendDocumentFile = function(contentType) {
    var file = documentDir + '/clean' + contentType.extension + (contentType.gzipped? '.gz': '');
    var stream = fs.createReadStream(file);
    stream.on('error', function(error) {
      utils.sendReponse(res, 500, 'Unable to send gzip file');
    });
    setResHeader(file, contentType);
    //I know last 6 chars are extension (either nt.gz or nq.gz). Just use this knowledge (won't change)
    stream.pipe(res);
    utils.logline('downloads.log', [req.headers["user-agent"], pathname]);
  };
  /**
  send meta-data dump file
  **/
  var sendDumpFile = function(file, filename) {
    var contentType = (filename.indexOf(".nq.") >= 0 ? contentTypes.nquads:  contentTypes.ntriples);
    var stream = fs.createReadStream(file);
    stream.on('error', function(error) {
      utils.sendReponse(res, 500, 'Unable to send gzip file');
    });
    res.setHeader('Content-disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-Type', contentType.mediaType);
    res.setHeader('Content-Encoding', "gzip");
    res.writeHead(200);
    stream.pipe(res);
    utils.logline('downloads.log', [req.headers["user-agent"], filename]);
  };
  /**
  get meta-data dump file
  **/
  var getDumpFile = function(path, callback) {
    if (path.indexOf(config.datadumps.extension, path.length - config.datadumps.extension.length) != -1) {
      var base = path.substring(0, path.length - config.datadumps.extension.length);
      if (base == config.datadumps.totalFile || base in config.datadumps.graphs) {
        var fileLocation = process.env['DATA_DUMP_DIR'] + "/" + path;
        fs.stat(fileLocation, function(err, stat) {
          if (err) {
            callback(false); //file probably does not exist
          } else {
            var downloadFilename = stat.mtime.getFullYear() + "-" + (stat.mtime.getMonth() + 1) + "-" + stat.mtime.getDate() + "_" + path;
            callback(fileLocation, downloadFilename);
          }
        });


      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  };



  if (pathname.length == 0) {
    utils.sendReponse(res, 406, 'No dataset defined in download request. To download a file, use the SPARQL endpoint or web interface to get the hash ID, and download the file using http://download.lodlaundromat.org/<md5>');
  } else {
    var dumpFile = getDumpFile(pathname, function(fileLocation, downloadName) {
      if (fileLocation) {
        //location of metadata dump
        return sendDumpFile(fileLocation, downloadName);
      } else {
        var contentType = guessContentTypeForDoc(function(err, contentType) {
          if (err) {
            utils.sendReponse(res, err.status, err.message);
          } else {
            sendDocumentFile(contentType);
          }
        });
      }
    });
  }
}).listen(config.fileHosting.port);
console.log('> File hosting backend running on ' + config.fileHosting.port);
