#!/usr/bin/env node

var datasetsDir = "/scratch/lodlaundromat/crawls/12/";
var targetFile = process.env.LDF_CONFIG;
if (!process.argv[2]) {
    console.log("no datasets directory provided. Using " + datasetsDir);
} else {
    datasetsDir = process.argv[2];
}

var fs = require('fs'),
path = require('path');

if (!fs.existsSync(datasetsDir)) {
    console.log(datasetsDir + " does not exist");
    process.exit(1);
}
function getDirectories(srcpath) {
    return fs.readdirSync(srcpath).filter(function(file) {
	return fs.statSync(path.join(srcpath, file)).isDirectory();
    });
}

var config = {
    title: "LOD Laundromat Linked Data Fragments server",
    baseURL: "http://ldf.lodlaundromat.org/",
    datasources: {}
};


function getFilesizeInBytes(filename) {
 var stats = fs.statSync(filename)
 var fileSizeInBytes = stats["size"]
 return fileSizeInBytes
}

console.log("Finding HDT files in " + datasetsDir);
fs.readdir(datasetsDir, function(err, datasetDirs) {

    datasetDirs.forEach(function(datasetDir) {
	datasetDir = datasetsDir + datasetDir;
	var hdtFile = datasetDir + "/clean.hdt";
	if (fs.existsSync(hdtFile)) {
	    var external = getFilesizeInBytes(hdtFile) < 1000000000; //less than 1 Gb
            var md5 = path.basename(datasetDir);
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
    console.log("writing config to " + targetFile);                                                                                                                                                            
    fs.writeFileSync(targetFile, JSON.stringify(config, null, '\t')); 

});


//console.log("writing config to " + targetFile);
//fs.writeFileSync(targetFile, JSON.stringify(config));

