var config = require('../../config.js'),
	http = require('http'),
	request = require('request'),
	md5 = require('MD5'),
	queryString = require('querystring');



module.exports = function(type, seeds, callback) {
    var getTurtle = function() {
    	var turtle = "@prefix llo: <http://lodlaundromat.org/ontology/> .\n";
    	for (var i = 0; i < seeds.length; i++) {
		var url = seeds[i].url;
    		turtle += "<http://lodlaundromat.org/resource/" + md5(url) +"> llo:md5 \"" + md5(url) + "\"^^xsd:string ;\n";
    		turtle += "llo:url <" + url + "> ;\n";
    		turtle += "llo:added \"" + xsdDateTime() + "\"^^xsd:dateTime .\n";
    	}
    	return turtle;
    };
    var addToGraph = (type == "url"? config.seedlistUpdater.seedlistGraph: config.seedlistUpdater.washingMachineGraph + process.env['CRAWL_ID']);
    var options = {
	url: config.seedlistUpdater.graphApi + '?' + queryString.stringify({"graph-uri": addToGraph}),
	headers: {
            'Content-Type': 'text/turtle'
	},
	method: 'POST',
	body: getTurtle()
    };
   request(options, function(err, response, body){
		if (err) {
		    callback(false, err.toString());
		} else if (response.statusCode >= 200 && response.statusCode < 300) {
		    callback(true);
		} else {
		    callback(false, body);
		}
    });
};


/**
* taken from http://forums.whirlpool.net.au/archive/1218957
*/
function xsdDateTime(date) {
    if (!date) date = new Date();
    function pad(n) {
	var s = n.toString();
	return s.length < 2 ? '0'+s : s;
    };

    var yyyy = date.getFullYear();
    var mm1  = pad(date.getMonth()+1);
    var dd   = pad(date.getDate());
    var hh   = pad(date.getHours());
    var mm2  = pad(date.getMinutes());
    var ss   = pad(date.getSeconds());

    return yyyy +'-' +mm1 +'-' +dd +'T' +hh +':' +mm2 +':' +ss;
}
