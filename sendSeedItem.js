var 	config = require('./config.json'),
	http = require('http'),
	request = require('request'),
	queryString = require('querystring');



module.exports = function(seedUrl, callback) {
    var getNtriple() {
	return "<http://test111> <http://test222> \"" + seedUrl + "\" .";
    }
    var options = {
	url: config.seedlistUpdater.graphApi + '?' + queryString.stringify({"graph-uri": config.seedlistUpdater.namedGraph}),
	headers: {
            'Content-Type': 'text/turtle'
	},
	method: 'POST',
	body: getNtriple()
    };
    console.log(options);    var req = request(options, function(err, response, body){
	console.log(err);
	if (err) {
	    callback(false, err.toString());
	} else if (response.statusCode != 200) {
	    callback(false, body);
	} else {
	    callback(true);
	}
    });
};

