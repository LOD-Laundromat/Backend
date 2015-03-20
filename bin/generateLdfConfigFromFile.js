#!/usr/bin/node

var currentVersion = "/12/";
var targetFile = process.env.LDF_CONFIG;
var hdtList = "/scratch/lodlaundromat/tmp/hdtQueue.txt"
if (process.argv[2]) {
    hdtList = process.argv[2];
}
console.log("fetching hdt list from " + hdtList);

var fs = require('fs'),
path = require('path');



if (!fs.existsSync(hdtList)) {
    console.log(hdtList + " does not exist");
    process.exit(1);
}

var tmpFile = hdtList + ".tmp";
fs.renameSync(hdtList, tmpFile);




var config = {
    title: "LOD Laundromat Linked Data Fragments server",
    baseURL: "http://ldf.lodlaundromat.org/",
    datasources: {}
};

var previousConfig = null;
if (fs.existsSync(targetFile)) {
    previousConfig = fs.readFileSync(targetFile);
    previousConfig = JSON.parse(previousConfig);
}


function getFilesizeInBytes(filename) {
 var stats = fs.statSync(filename)
 var fileSizeInBytes = stats["size"]
 return fileSizeInBytes
}

fs.readFile(tmpFile, function (err, data) {
    var bufferString = data.toString();
    if (bufferString.length > 0) {
	var hdts = bufferString.split('\n'); 
	if (hdts.length > 0) {
	    hdts.forEach(function(hdtDir){
		var hdtFile = hdtDir.trim() + '/clean.hdt';
		if (hdtFile.indexOf(currentVersion) >= 0 && fs.existsSync(hdtFile)) {
		    var external = getFilesizeInBytes(hdtFile) < 1000000000; //less than 1 Gb
		    var md5 = path.basename(hdtDir);
		    config.datasources[md5] = {
			type: "HdtDatasource",
			settings: {
			    file: hdtFile,
			    external: external,
			    checkFile: false
			}
		    }
		    
		}
	    }) 
	}
    }



    if (Object.keys(config.datasources).length) {
	console.log("writing config to " + targetFile);
	//ok, we have new info. Store it!
	if (previousConfig) {
	    for (var md5 in config.datasources) {
		previousConfig.datasources[md5] = config.datasources[md5];
		
	    }
	    fs.writeFileSync(targetFile, JSON.stringify(previousConfig, null, '\t'));
	} else {
	    fs.writeFileSync(targetFile, JSON.stringify(config, null, '\t'));
	}
	process.exit(0);
    } else {
	console.log("No new hdt files found in file. not updating config");
	console.log(config.datasources);
	process.exit(1);
    }
});


