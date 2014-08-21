var util = require('util'),  
    http = require('http'),
	fs = require('fs'),
	url = require('url'),
	path = require('path'),
	seedlistUpdater = require('./sendSeedItem.js'),
	config = require('./config.json');

if (!config.fileHosting.dataDir) throw new Error('No data directory defined');
if (!fs.existsSync(config.fileHosting.dataDir)) throw new Error('Data directory not found: ' + config.dataDir);
if (!config.fileHosting.port) throw new Error('No port defined to run  file hosting server on');
if (!config.fileHosting.llVersion) throw new Error('No version defined to serve files for');

if (!config.loggingDir) throw new Error("No logging dir specified");
if (!fs.existsSync(config.loggingDir)) throw new Error("Logging dir does not exist");




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
	    fs.appendFile(config.loggingDir + '/downloads.log', req.headers["user-agent"] + ' - ' + hash + '\n');
	    
	};
	
	var hash = path.basename(url.parse(req.url, true).path);
	if (hash.length == 0) {
		res.writeHead(406, 'No dataset defined in download request');
		res.end();
	} else {
		var datasetDir = config.fileHosting.dataDir + '/' + config.fileHosting.llVersion + '/' + hash;
		fs.exists(datasetDir, function(datasetDirExists) {
			if (!datasetDirExists) {
				console.log(datasetDir);
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
//	seedlistUpdater

	var seed = (url.parse(req.url, true).query).url;
	if (!seed || seed.trim().length == 0) {
		res.writeHead(400, 'No seed item given as argument');
		res.end();
	} else {
		var parsedSeed = url.parse(seed.trim());
		//validate seed
		console.log(parsedSeed);
		if (parsedSeed.protocol && parsedSeed.protocol.indexOf('http') == 0) {
			//only pass along the parsed href! (this avoids injection into our turtle insert)
			seedlistUpdater(parsedSeed.href, function(success, body) {
				if (success) {
					res.writeHead(200, 'Successfully added ' + parsedSeed.href + ' to the seed list');
					
				} else {
					res.writeHead(500, 'Failed to add ' + parsedSeed.href + " to the seed list");
					res.write(body);
					res.end();
				}
				
			});
		} else {
			res.writeHead(400, 'The seed item is not a URI: ' + seed);
			res.end();
		}
	}
	
}).listen(config.seedlistUpdater.port);
util.puts('> Seed list backend running on ' + config.seedlistUpdater.port);