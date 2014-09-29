#!/usr/bin/env node

var fs = require('fs'),
	config = require('../config.json'),
	shell = require('shelljs'),
	queryString = require('querystring');



if (!fs.existsSync(config.datadumps.dumpLocation)) throw new Error("Dump location does not exist: " + config.datadumps.dumpLocation);


console.log("cleaning old dumps");
shell.rm('-r', config.datadumps.dumpLocation + '/*');


var graphs = config.datadumps.graphs



var createDataDump = function(graphsToDo) {
	var graphUri = null;
	for (graphUri in graphsToDo) break;
	if (graphUri == null) {
		console.log("> no graphs left to create data dump for");
	} else {
		var targetFileName = graphsToDo[graphUri];
		console.log("> creating dump for graph " + graphUri);
		var targetPath = config.datadumps.dumpLocation + "/" + targetFileName;
		var singleDumpFile = config.datadumps.dumpLocation + "/" + targetFileName + ".gz";
		shell.mkdir(targetPath);
		
		exec('isql exec="dump_ntriples(\'' + graphUri + '\', \'' + targetPath + '\')"', function(exitCode, output) {
			console.log(">> finished exporting dumps. Creating single file");
			exec('cat ' + targetPath + '/* >> ' + singleDumpFile, function(exitCode, output) {
				console.log(">> finished creating single file");
				delete graphsToDo[graphUri];
				createDataDump(graphsToDo);
			});
		});
	}
};

