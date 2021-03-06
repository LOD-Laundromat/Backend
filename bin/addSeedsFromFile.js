#!/usr/bin/env node

//Non-HTTP(S) URLs that are currently not used.
//file:///var/www/vhosts/wildcard.rkbexplorer.com/repositories/void.rkbexplorer.com/models/5/d/2/0/5d20381b766258b7e05ea0560f826b8d.ttl#DS1
//file:///var/www/vhosts/wildcard.rkbexplorer.com/repositories/void.rkbexplorer.com/models/5/d/2/0/5d20381b766258b7e05ea0560f826b8d.ttl#DS2
//file:///var/www/vhosts/wildcard.rkbexplorer.com/repositories/void.rkbexplorer.com/models/a/6/e/b/a6ebae7f00baebe54c51cde89df0b2b3.ttl#DS1
//ftp://ftp.uniprot.org/pub/databases/uniprot/current_release/rdf/taxonomy.rdf.gz
//ftp://ftp.uniprot.org/pub/databases/uniprot/current_release/rdf/uniprot.rdf.gz
//ttp://rod.eionet.europa.eu/issues


var fs = require('fs'),
	http = require('http'),
	queryString = require('querystring');
/**
 * Check and validate file
 */
var filename = null;
if (process.argv.length > 2) {
	filename = process.argv[2];
}
if (!fs.existsSync(filename)) {
	console.log("File " + filename + " does not exist. Specify an argument");
	process.exit(1);
}
var seeds = fs.readFileSync(filename).toString().split("\n");
for (var i in seeds) {
	var request = require('request');
	request.get("http://backend.lodlaundromat.org?" + queryString.stringify({lazy: "1", url: seeds[i]}), function (error, response, body) {
	    if (response) {
		console.log(response.statusCode);
	    } else {
		console.log("no response");
	    }
	});
};
