var util = require('util'),  
    http = require('http'),
	fs = require('fs'),
	url = require('url'),
	path = require('path'),
	config = require('./config.json');

if (!config.dataDir) throw new Error('No data directory defined');
if (!fs.existsSync(config.dataDir)) throw new Error('Data directory not found: ' + config.dataDir);
if (!config.filehostingPort) throw new Error('No port defined to run  file hosting server on');
if (!config.llVersion) throw new Error('No version defined to serve files for');
if (!config.endpoint) throw new Error('No endpoint defined to query');
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
		var datasetDir = config.dataDir + '/' + config.llVersion + '/' + hash;
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
}).listen(config.filehostingPort);
util.puts('> File hosting backend running on ' + config.filehostingPort);


/**
 * Run seed list updater server
*/