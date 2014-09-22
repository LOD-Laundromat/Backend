var util = require('util'),  
    http = require('http'),
	url = require('url'),
	iri = require('node-iri'),
	request = require('request'),
	queryString = require('querystring'),
	utils = require('./utils.js'),
	seedlistUpdater = require('./sendSeedItem.js'),
	config = require('./config.json');

/**
 * Run seed list updater server
*/
if (!config.seedlistUpdater.graphApi) throw new Error('No graph API URL defined to send new seed list items to');
if (!config.seedlistUpdater.washingMachineGraph) throw new Error('No washing machine graph defined to store new seed list items in');
if (!config.seedlistUpdater.seedlistGraph) throw new Error('No seedlistGraph defined to store new seed list items in');
if (!config.seedlistUpdater.llVersion) throw new Error('No ll version defined');
if (!config.seedlistUpdater.port) throw new Error('No port defined to run seed list API on');


var defaults = {
	url: null,
	lazy: 0,
	from: null,
	type: "url",
};
var lazySeeds = {
	url: {},
	archive: {}
};
var latestLazyAdded = {
	url: null,
	archive: null
};
var addLazySeed = function(res,args) {
	lazySeeds[args.type][args.url] = [args.from];
	latestLazyAdded[args.type] = new Date();
	utils.sendReponse(res,202, 'Added lazy arg ' + args.url + ' to be added to seed list later');
};


var addSeeds = function(req, res, type, seeds) {
	var urls = [];
	for (var url in seeds) urls.push(url);
	var query = "PREFIX llo: <http://lodlaundromat.org/ontology/> \n SELECT * WHERE {\n";
	for (var i = 0; i < urls.length; i++ ){
		query += "BIND ( EXISTS {[] llo:url  <" + urls[i] + "> } AS ?" + i + " ) .\n";
	}
	query += "}";
	request.post({url: config.seedlistUpdater.sparqlEndpoint, headers: { "Accept": "application/json"}, form: {query: query}}, function(error, response, body) {
		if (response.statusCode != 200) {
			console.log(query);
			console.log(error, body);
			utils.sendReponse(res,500, 'SPARQL query failed: Unable to check whether the seed item(s) was/were already added');
		} else {
			
			var sparqlJson = (JSON.parse(body));
			var seedsToAdd = {};
			var seedNum = 0;
			for (var i = 0; i < urls.length; i++) {
				var url = urls[i];
				//just have 1 row of bindings
				if (sparqlJson.results.bindings[0][i].value == "0") {
					seedNum++;
					seedsToAdd[url] = seeds[url];
				}
			};
			
			
			if (urls.length == 1 && seedNum == 0) {
				//just 1 url, probably a user who'd like some feedback
				utils.sendReponse(res,400, 'This seed is already in our list: ' + urls[0]);
				utils.logline('alreadyAddedSeeds.log', [(req?req.headers["user-agent"]: ""),urls[0]]);
			} else {
				seedlistUpdater(type, seedsToAdd, function(success, body) {
					var addedUrls = [];
					for (var url in seedsToAdd) {
						addedUrls.push(url);
					}
					if (success) {
						utils.sendReponse(res, 202, 'Successfully added ' + (addedUrls.length == 1? addedUrls[0]: addedUrls.length + " seeds") + ' to the seed list');
					} else {
						utils.sendReponse(res, 500, 'Failed to add ' + (addedUrls.length == 1? addedUrls[0]: addedUrls.length + " seeds") + " to the seed list");
					}
					if (req) addedUrls.unshift(req.headers["user-agent"]);
					utils.logline('addedSeeds.log',addedUrls);
				});
			}
		}
	});
};


http.createServer(function (req, res) {
	// Set CORS headers
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Request-Method', '*');
	res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
	res.setHeader('Access-Control-Allow-Headers', '*');
	if ( req.method === 'OPTIONS' ) {
		res.writeHead(200);
		res.end();
		return;
	}
	
	var args = utils.extend({}, defaults, (url.parse(req.url, true).query));
	
	if (args.type != "url" && args.type != "archive") {
		utils.sendReponse(res,400, 'Unrecognized \'type\' argument: ' + args.type + '. Supported: [url|archive]');
		return;
	}

	if (args.url) {
		args.url = new iri.IRI(args.url).toURIString();
		args.url = args.url.trim();
	}
	if (!args.url || args.url.length == 0) {
		utils.sendReponse(res, 400, 'No seed item given as argument');
		utils.logline('faultySeeds.log', [req.headers["user-agent"],args.url]);
	} else {
		//validate seed
		if (args.url.indexOf('http') == 0) {
			if (args.lazy) {
				addLazySeed(res, args);
				return;
			} else {
				var param = {};
				param[args["url"]] = args["from"];
				addSeeds(req, res, args.type, param);
				
			}
		} else {
			utils.sendReponse(res,400, 'The seed item is not a URI: ' + args.url);
			utils.logline('faultySeeds.log', [req.headers["user-agent"],args.url]);
		}
	}
	
}).listen(config.seedlistUpdater.port);
util.puts('> Seed list backend running on ' + config.seedlistUpdater.port);


function sleep(seconds, callback) {
    setTimeout(function()
            { callback(); }
    , seconds * 1000);
}


var checkLazyList = function() {
	sleep(config.seedlistUpdater.checkLazyListInterval, function() {
		if (Object.keys(lazySeeds.url).length > config.seedlistUpdater.maxSeedlistSize || (latestLazyAdded.url && (new Date() - latestLazyAdded.url) > (config.seedlistUpdater.maxSeedlistTime * 1000))) {
			var urlLazySeeds = JSON.parse(JSON.stringify(lazySeeds.url));//clone
			lazySeeds.url = {};
			
			addSeeds(null,null,"url", urlLazySeeds);
			latestLazyAdded.url = null;
		}
		if (Object.keys(lazySeeds.archive).length > config.seedlistUpdater.maxSeedlistSize || (latestLazyAdded.archive && (new Date() - latestLazyAdded.archive) > (config.seedlistUpdater.maxSeedlistTime * 1000))) {
			var archiveLazySeeds = JSON.parse(JSON.stringify(lazySeeds.archive));//clone
			lazySeeds.archive = {};
			addSeeds(null,null,"archive", archiveLazySeeds);
			latestLazyAdded.archive = null;
		}
		checkLazyList();//does another sleep
	});
};
checkLazyList();
