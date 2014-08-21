var 	config = require('./config.json'),
	http = require('http'),
	request = require('request'),
	md5 = require('MD5'),
	queryString = require('querystring');



module.exports = function(seedUrl, callback) {
    var getTurtle = function() {
    	return "@prefix ll: <http://lodlaundromat.org/vocab#> . \
<http://lodlaundromat.org/vocab#" + md5(seedUrl) +"> ll:md5 \"" + md5(seedUrl) + "\"^^xsd:string ; \
    ll:url <" + seedUrl + "> ; \
    ll:added \"" + xsdDateTime() + "\"^^xsd:dateTime .";
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
		} else if (response.statusCode >= 200 && response.statusCode < 300) {
		    callback(true);
		} else {
		    callback(false, body);
		}
    });
};

//module.exports("http://test", function(a,b){
//    console.log(a,b);
//});

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
