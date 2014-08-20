var config = require('./config.json'),
	queryString = require('querystring');
module.exports = function(seedUrl) {
	var post_options = {
	      host: config.endpoint,
	      path: "/?"+ queryString.stringify({"using-named-graph-uri": "http://testlodlaundromat.org#" + llVersion}),
	      port: '80',
	      method: 'POST',
	      headers: {
	          'Content-Type': 'text/turtle',
	      }
	  };
	var req = http.request(post_options, function(response){
		
	});
	req.write("<http://test111> <http://test222> <http://test333> .");
	req.end();
};

//module.exports();