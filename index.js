var util = require('util'),  
    http = require('http'),
	fs = require('fs');

var config = require('./config.json');

if (!config.dataDir) throw new Error('No data directory defined');
if (!fs.existsSync(config.dataDir)) throw new Error('Data directory not found: ' + config.dataDir);
if (!config.port) throw new Error('No port defined to run server on');
if (!config.llVersion) throw new Error('No version defined to serve files for');
if (!config.endpoint) throw new Error('No endpoint defined to query');



		
http.createServer(function (req, res) {  
	if (req.url.indexOf("/data/") == 0) {
		serveDataFile(req,res);
	}
	
}).listen(config.port);

util.puts('> LOD Laundromat Backend running on ' + config.port);

var serveDataFile = function(req,res) {
	var sendFile = function(file) {
		var contentType = "application/x-gzip";
		var stream = fs.createReadStream(file);
		 
	    stream.on('error', function(error) {
	    	res.writeHead(500, 'Unable to send gzip file');
	        return;
	    });
 
 
	    res.setHeader('Content-Type', contentType);
	    res.writeHead(200);
	    stream.pipe(res);
	};
	
	
	
	var hash = req.url.substring("/data/".length);
	if (hash.length == 0) {
		res.writeHead(406, 'No dataset defined in download request');
		res.end();
		return;
	} else {
		var datasetDir = config.dataDir + '/' + config.llVersion + '/' + hash;
		fs.exists(datasetDir, function(datasetDirExists) {
			if (!datasetDirExists) {
				console.log(datasetDir);
				res.writeHead(404, 'Dataset not found on disk');
				res.end();
				return;
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
							return;
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
};


