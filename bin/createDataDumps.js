#!/usr/bin/env node

var fs = require('fs'),
	config = require('../config.js'),
	shell = require('shelljs'),
	queryString = require('querystring');



if (!fs.existsSync(config.datadumps.dumpLocation)) throw new Error("Dump location does not exist: " + config.datadumps.dumpLocation);

console.log("cleaning old dumps");
var dumpLocation = config.datadumps.dumpLocation;
if (dumpLocation && dumpLocation.length > 5) {
	shell.rm('-rf', config.datadumps.dumpLocation + '/*');
} else {
	console.log("strange dump location. Sure we're not deleting root? ;)");
	process.exit(1);
}


var graphs = config.datadumps.graphs



var createDataDump = function(graphsToDo) {
	var graphName = null;
	for (graphName in graphsToDo) break;
	if (graphName == null) {
		console.log("> no graphs left to create data dump for");
	} else {
		var graphUri = graphsToDo[graphName];
	    if (typeof graphUri == "function") graphUri = graphUri();
		console.log("> creating dump for graph " + graphUri);
		var targetPath = config.datadumps.dumpLocation + "/" + graphName;
		var singleDumpFile = config.datadumps.dumpLocation + "/" + graphName + config.datadumps.extension;
		shell.mkdir(targetPath);
		console.log('isql exec="dump_ntriples(\'' + graphUri + '\', \'' + targetPath + '\')"');
		shell.exec('isql exec="dump_ntriples(\'' + graphUri + '\', \'' + targetPath + '\')"', function(exitCode, output) {
			console.log(">> finished exporting dumps. Creating single file");
			shell.exec('cat ' + targetPath + '/* >> ' + singleDumpFile, function(exitCode, output) {
				console.log(">> finished creating single file");
				delete graphsToDo[graphName];
				createDataDump(graphsToDo);
			});
		});
	}
};

createDataDump(graphs);
