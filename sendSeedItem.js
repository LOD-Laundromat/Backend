var 	config = require('./config.json'),
	http = require('http'),
	request = require('request'),
	md5 = require('MD5'),
	queryString = require('querystring');



module.exports = function(seedUrl, callback) {
    var getTurtle = function() {
    	return 
"@prefix ll : <http://lodlaundromat.org/vocab#> .\n\
<http://lodlaundromat.org/vocab#" + md5(seedUrl) +"> ll:md5 \"" + md5(seedUrl) + "\"^^xsd:string ;\n\
    ll:url <" + seedUrl + "> ;\n\
    ll:added \"" + new Date().toString() + "\"^^xsd:dateTime .";
    };
    
    
    var options = {
	url: config.seedlistUpdater.graphApi + '?' + queryString.stringify({"graph-uri": config.seedlistUpdater.namedGraph}),
	headers: {
            'Content-Type': 'text/turtle'
	},
	method: 'POST',
	body: getTurtle()
    };
   request(options, function(err, response, body){
		if (err) {
		    callback(false, err.toString());
		} else if (response.statusCode != 200) {
		    callback(false, body);
		} else {
		    callback(true);
		}
    });
};

//module.exports("http://test");