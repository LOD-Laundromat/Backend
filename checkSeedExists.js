var config = require('./config.json'),
	queryString = require('querystring'),
	http = require('http');
module.exports = function(seed, callback) {
	var query = "PREFIX ll: <http://lodlaundromat.org/vocab#> \n"+
		"ASK { [] ll:url <" + seed + "> ;\n" +
		"	ll:added [] .}";
	http.get(config.seedlistUpdater.sparqlEndpoint + "?" + queryString.stringify({query: query}),
			function(response) {
		if (response.statusCode != 200) {
			callback(null);
		} else {
			var body = '';
			response.on('data', function(chunk) {
				body += chunk;
			});
			response.on('end', function() {
				if (body.toLowerCase() == "true") {
					callback(true);
				} else {
					callback(false);
				}
			});
		}
	});
};