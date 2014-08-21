var 	config = require('./config.json'),
	http = require('http'),
	request = require('request'),
	queryString = require('querystring');



module.exports = function(seedUrl, callback) {
    var options = {
	url: config.endpoint + '?' + queryString.stringify({"graph-uri": "http://lodlaundromat.org#seedlist"}),
	headers: {
            'Content-Type': 'text/turtle'
	},
	method: 'POST',
	body: "<http://test111> <http://test222> <http://test333> ."
    };
    
    var req = request(options, function(err, response, body){
	if (err) {
	    callback(false, body);
	} else if (response.statusCode != 200) {
	    callback(false, body);
	} else {
	    callback(true);
	}
    });
};

module.exports();
