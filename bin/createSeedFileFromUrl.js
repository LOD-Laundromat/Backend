#!/usr/bin/env node
String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

var fs = require('fs'),
	http = require('http'),
	request = require('request'),
	jsdom = require('jsdom'),
	queryString = require('querystring');
	
var outFileName = 'fetchedSeeds.data';
if (fs.existsSync(outFileName)) fs.unlinkSync(outFileName);
var urlsToCheck = [];
if (process.argv.length > 2) {
	urlsToCheck.push(process.argv[2]);
	
}

if (urlsToCheck.length == 0) {
	console.log('Pass url to fetch seeds from as param');
	process.exit(1);
}
var seeds = [];

var checkUrl = function(url) {
	request.get(url, function (error, response, body) {
	if (error|| response.statusCode !== 200) {
	  console.log('Error when contacting url ' + url)
    } else {
		 jsdom.env(
		body,
		['http://code.jquery.com/jquery-2.1.3.min.js'],
		function (err, window) {
			var $ = window.jQuery;
			
			
			
			/**
			 * 
			 * Parse a page like this: http://data.semanticweb.org/dumps/
			 */
			$('a').each(function() {
				var el = $(this);
				if (el.text() == 'Parent Directory') return;
				if (el.attr('href').endsWith('.rdf')) {
					seeds.push(url + '/' + el.attr('href'));
					
				} else if (el.attr('href').endsWith('/') && el.attr('href').length > 1) {
					//a folder. follow it
					urlsToCheck.push(url + '/' + el.attr('href'));
				}
			});
			checkUrls();
		});
	
  }
	
});
}

var checkUrls = function() {
	if (urlsToCheck.length > 0) {
		checkUrl(urlsToCheck.pop());
	} else {
		fs.writeFile(
			 outFileName,
			 seeds.join('\n'),
			 function (err) { console.log(err ? 'Error :'+err : 'done writing file to ' + outFileName )}
		);
		
	}
	
};
checkUrls();

