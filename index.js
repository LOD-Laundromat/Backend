var util = require('util'),  
    http = require('http'),
	fs = require('fs'),
	url = require('url'),
	path = require('path'),
	iri = require('node-iri'),
	queryString = require('querystring'),
	seedlistUpdater = require('./sendSeedItem.js'),
	config = require('./config.json');

if (!config.fileHosting.dataDir) throw new Error('No data directory defined');
if (!fs.existsSync(config.fileHosting.dataDir)) throw new Error('Data directory not found: ' + config.dataDir);
if (!config.fileHosting.port) throw new Error('No port defined to run  file hosting server on');
if (!config.fileHosting.llVersion) throw new Error('No version defined to serve files for');

if (!config.loggingDir) throw new Error("No logging dir specified");
if (!fs.existsSync(config.loggingDir)) throw new Error("Logging dir does not exist");

var logLine = function(filename, messages) {
	fs.appendFile(config.loggingDir + '/' + filename, new Date().toString + ' - ' + messages.join(' - ') + '\n');
};


/**
 * Run file hosting server
 */
http.createServer(function (req, res) { 
	var sendFile = function(file) {
		var contentType = "application/x-gzip";
		var stream = fs.createReadStream(file);
	    stream.on('error', function(error) {
	    	res.writeHead(500, 'Unable to send gzip file');
	    });
	    //I know last 6 chars are extension (either nt.gz or nq.gz). Just use this knowledge (won't change)
	    res.setHeader('Content-disposition', 'attachment; filename=' + hash + file.slice(-6));
	    res.setHeader('Content-Type', contentType);
	    res.writeHead(200);
	    stream.pipe(res);
	    logLine('downloads.log',  [req.headers["user-agent"],hash]);
	};
	
	var hash = path.basename(url.parse(req.url, true).path);
	if (hash.length == 0) {
		res.writeHead(406, 'No dataset defined in download request');
		res.end();
	} else {
		var datasetDir = config.fileHosting.dataDir + '/' + config.fileHosting.llVersion + '/' + hash;
		fs.exists(datasetDir, function(datasetDirExists) {
			if (!datasetDirExists) {
				res.writeHead(404, 'Dataset not found on disk');
				res.end();
			}
			//ok, dataset directory exists. Does it have a clean file though...
			var ntFile = datasetDir + '/clean.nt.gz';
			fs.exists(ntFile, function(ntFileExists) {
				if (!ntFileExists) {
					//ah, no nt file! Check for an nq file..
					var nqFile = datasetDir + '/clean.nq.gz';
					fs.exists(nqFile, function(nqFileExists) {
						if (!nqFileExists) {
							//no nq file AND no nt file..
							res.writeHead(404, 'No cleaned file found for this dataset.');
							res.end();
						} else {
							sendFile(nqFile);
							
						}
					});
				} else {
					sendFile(ntFile);
				}
				
			});
			
		});
	}
}).listen(config.fileHosting.port);
util.puts('> File hosting backend running on ' + config.fileHosting.port);


/**
 * Run seed list updater server
*/


if (!config.seedlistUpdater.graphApi) throw new Error('No graph API URL defined to send new seed list items to');
if (!config.seedlistUpdater.namedGraph) throw new Error('No named graph defined to store new seed list items in');
if (!config.seedlistUpdater.port) throw new Error('No port defined to run seed list API on');
http.createServer(function (req, res) {
	// Set CORS headers
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Request-Method', '*');
	res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
	res.setHeader('Access-Control-Allow-Headers', '*');
	if ( req.method === 'OPTIONS' ) {
		res.writeHead(200);
		res.end();
		return;
	}
	
	var seedAdded = function(seed, callback) {
		var query = "PREFIX ll: <http://lodlaundromat.org/vocab#> \n"+
			"ASK { [] ll:url <" + seed + "> ;\n" +
			"	ll:added [] .}";
		http.get(config.seedlistUpdater.sparqlEndpoint + "?" + queryString.stringify({query: query}),
				function(response) {
			if (response.statusCode != 200) {
				callback(null);
			} else {
				var body = '';
				response.on('data', function(chunk) {
					body += chunk;
				});
				response.on('end', function() {
					if (body.toLowerCase() == "true") {
						callback(true);
					} else {
						callback(false);
					}
				});
			}
		});
	};
	
	var seed = (url.parse(req.url, true).query).url;
	if (seed) {
		seed = new iri.IRI(seed).toURIString();
		seed = seed.trim();
	}
	if (!seed || seed.length == 0) {
		res.writeHead(400, 'No seed item given as argument');
		res.end();
		logLine('faultySeeds.log', [req.headers["user-agent"],seed]);
	} else {
		//validate seed
		if (seed.indexOf('http') == 0) {
			//only pass along the parsed href! (this avoids injection into our turtle insert)
			seedAdded(seed, function(alreadyAdded) {
				if (alreadyAdded === null) {
					//hmz, something went wrong with checking whether it was already added.
					res.writeHead(500, 'SPARQL query failed: Unable to check whether this seed was already added: ' + seed);
					res.end();
				} else if (alreadyAdded) {
					res.writeHead(400, 'This seed is already in our list: ' + seed);
					res.end();
					logLine('alreadyAddedSeeds.log', [req.headers["user-agent"],seed]);
				} else {
					seedlistUpdater(seed, function(success, body) {
						if (success) {
							res.writeHead(202, 'Successfully added ' + seed + ' to the seed list');
							res.end();
						} else {
							res.writeHead(500, 'Failed to add ' + seed + " to the seed list");
							if (body) res.write(body);
							res.end();
						}
						logLine('addedSeeds.log', [req.headers["user-agent"],seed]);
					});
				}
			});
		} else {
			res.writeHead(400, 'The seed item is not a URI: ' + seed);
			res.end();
			logLine('faultySeeds.log', [req.headers["user-agent"],seed]);
		}
	}
	
}).listen(config.seedlistUpdater.port);
util.puts('> Seed list backend running on ' + config.seedlistUpdater.port);
