#!/usr/bin/env node

var fs = require('fs'),
	config = require('../config.js'),
	shell = require('shelljs'),
	queryString = require('querystring');



if (!fs.existsSync(process.env['DATA_DUMP_DIR'])) throw new Error("Dump location does not exist: " + process.env['DATA_DUMP_DIR']);

console.log("cleaning old dumps");
var dumpLocation = process.env['DATA_DUMP_DIR'];
if (dumpLocation && dumpLocation.length > 5) {
	shell.rm('-rf', dumpLocation + '/*');
} else {
	console.log("strange dump location. Sure we're not deleting root? ;)");
	process.exit(1);
}


var graphs = config.datadumps.graphs



var createDataDump = function(graphsToDo) {
	var graphName = null;
	for (graphName in graphsToDo) break;
	if (graphName == null) {
		console.log("> no graphs left to create data dump for. Now concatenating all the gzipped dumps");
	    var totalFile = dumpLocation + '/' + config.datadumps.totalFile + config.datadumps.extension;
	    shell.exec('cat ' + dumpLocation + '/*' + config.datadumps.extension + ' >> ' + totalFile, function(exitCode, output) {
		if (exitCode) {
		    console.log('failed to create total gzipped file');
		} else {
		    console.log('created total gzipped file at ' + totalFile);
		}
	    });
	} else {
		var graphUri = graphsToDo[graphName];
	    if (typeof graphUri == "function") graphUri = graphUri();
		console.log("> creating dump for graph " + graphUri);
		var targetPath = dumpLocation + "/" + graphName;
		var singleDumpFile = dumpLocation + "/" + graphName + config.datadumps.extension;
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
