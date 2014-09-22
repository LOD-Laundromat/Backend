var util = require('util'),  
    http = require('http'),
	fs = require('fs'),
	url = require('url'),
	path = require('path'),
	utils = require('./utils.js'),
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
	    	utils.sendReponse(res, 500, 'Unable to send gzip file');
	    	
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
		utils.sendReponse(res,406, 'No dataset defined in download request. To download a file, use the SPARQL endpoint or web interface to get the hash ID, and download the file using http://download.lodlaundromat.org/<md5>');
	} else {
		var datasetDir = config.fileHosting.dataDir + '/' + config.fileHosting.llVersion + '/' + hash;
		fs.exists(datasetDir, function(datasetDirExists) {
			if (!datasetDirExists) {
				utils.sendReponse(res,404, 'Dataset not found');
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
							utils.sendReponse(res,404, 'No cleaned file found for this dataset.');
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