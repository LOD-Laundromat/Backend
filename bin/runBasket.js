#!/usr/bin/env node

//Non-HTTP(S) URLs that are currently not used.
//file:///var/www/vhosts/wildcard.rkbexplorer.com/repositories/void.rkbexplorer.com/models/5/d/2/0/5d20381b766258b7e05ea0560f826b8d.ttl#DS1
//file:///var/www/vhosts/wildcard.rkbexplorer.com/repositories/void.rkbexplorer.com/models/5/d/2/0/5d20381b766258b7e05ea0560f826b8d.ttl#DS2
//file:///var/www/vhosts/wildcard.rkbexplorer.com/repositories/void.rkbexplorer.com/models/a/6/e/b/a6ebae7f00baebe54c51cde89df0b2b3.ttl#DS1
//ftp://ftp.uniprot.org/pub/databases/uniprot/current_release/rdf/taxonomy.rdf.gz
//ftp://ftp.uniprot.org/pub/databases/uniprot/current_release/rdf/uniprot.rdf.gz
//ttp://rod.eionet.europa.eu/issues


var fs = require('fs'),
	checkSeedExists = require('../checkSeedExists.js'),
	sendSeedItem = require('../sendSeedItem');


/**
 * Check and validate file
 */
var filename = 'url.data';
if (!fs.existsSync(filename)) {
	if (process.argv.length <= 2) {
		console.log("No file to import. Pass one as argument");
		process.exit(1);
	} else {
		filename = process.argv[2];
		if (!fs.existsSync(filename)) {
			console.log("File " + filename + " does not exist");
			process.exit(1);
		}
	}
}



var seeds = fs.readFileSync(filename).toString().split("\n");
for(var i in seeds) {
	checkSeedExists(seeds[i], function(exists) {
		if (exists) {
			console.log(seeds[i] + ': already added');
		} else {
		    sendSeedItem(seeds[i], function(success, errorMsg) {
		    	var msg = seeds[i] + ': ';
		    	if (success) {
		    		msg += 'added';
		    	} else {
		    		msg += 'failed (' + errorMsg + ')';
		    	}
		    	console.log(msg);
		    });
		};
	});
};
