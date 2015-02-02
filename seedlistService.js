var util = require('util'),  
    http = require('http'),
	url = require('url'),
	iri = require('node-iri'),
	request = require('request'),
	queryString = require('querystring'),
	utils = require('./utils.js'),
	seedlistUpdater = require('./sendSeedItem.js'),
	config = require('./config.js');

/**
 * Run seed list updater server
*/
if (!config.seedlistUpdater.graphApi) throw new Error('No graph API URL defined to send new seed list items to');
if (!config.seedlistUpdater.washingMachineGraph) throw new Error('No washing machine graph defined to store new seed list items in');
if (!config.seedlistUpdater.seedlistGraph) throw new Error('No seedlistGraph defined to store new seed list items in');
if (!config.llVersion) throw new Error('No ll version defined');
if (!config.seedlistUpdater.port) throw new Error('No port defined to run seed list API on');


var defaults = {
	url: null,
	lazy: 0,
	from: null,
	type: "url",
};
var lazySeeds = {
	url: [],
	archive: []
};
var latestLazyAdded = {
	url: null,
	archive: null
};

/**
 * Returns string representation of parsed URI.
 * Cannot use the toURIString method, because this does not deal with casing issues (for e.g. the scheme)
 */
var parsedUriToString = function(parsedUri) {
  var toUriString = function(part) {
    return part.replace(/([\uA0-\uD7FF\uE000-\uFDCF\uFDF0-\uFFEF]|[\uD800-\uDBFF][\uDC00-\uDFFF])/g, function(a){return encodeURI(a);});
  }
   return '' +
      toUriString(parsedUri.scheme().toLowerCase()) + 
      '://' +
      (parsedUri.scheme()?toUriString(parsedUri.authority()):'') +
      (parsedUri.path()?toUriString(parsedUri.path()): '') +
      (parsedUri.query()?toUriString(parsedUri.query()):'') +
      (parsedUri.fragment()?toUriString(parsedUri.fragment()): '');
};

var addLazySeed = function(res,args, parsedUri) {
  var url = parsedUriToString(parsedUri);
	lazySeeds[args.type].push({url: url, from: args.from});
	latestLazyAdded[args.type] = new Date();
	utils.sendReponse(res,202, 'Added lazy arg ' + url + ' to be added to seed list later');
};

var makeSeedsUnique = function(seeds) {
	var checkedUrls = {};
	var uniqueSeeds = [];
	for (var i = 0; i < seeds.length; i++) {
		var url = seeds[i].url;
		if (!checkedUrls[url]) {
			checkedUrls[url] = true;
			uniqueSeeds.push(seeds[i]);
		}
	}
	return uniqueSeeds;
};

var checkSeedAlreadyAdded = function(seedUrl, callback) {
	var query = "PREFIX llo: <http://lodlaundromat.org/ontology/> \n ";
	query += "ASK {[] llo:url  <" + seedUrl + "> }";
	request.post({url: config.seedlistUpdater.sparqlEndpoint, headers: { "Accept": "text/plain"}, form: {query: query}}, function(error, response, body) {
		if (response.statusCode != 200) {
			console.log("could not check whether " + seedUrl + " was already in seed list... Assuming it is not");
			callback(false);
		} else {
			callback(body.toLowerCase() == "true");
		}
	});
};
var checkSeedsAlreadyAdded = function(seeds, finalCallback, i, seedsToAdd) {
	if (i == undefined) i = 0;
	if (seedsToAdd == undefined) seedsToAdd = [];
	if (seeds[i]) {
		checkSeedAlreadyAdded(seeds[i].url, function(alreadyAdded) {
			if (alreadyAdded != null && alreadyAdded == false) seedsToAdd.push(seeds[i]);
			checkSeedsAlreadyAdded(seeds, finalCallback, i+1, seedsToAdd);
			
		});
	} else {
		//we've reached the end
		finalCallback(seedsToAdd);
	}
};

var addSeeds = function(req, res, type, seeds) {
	seeds = makeSeedsUnique(seeds);
	checkSeedsAlreadyAdded(seeds, function(seedsToAdd){

		if (seeds.length == 1 && seedsToAdd.length == 0) {
			//just 1 url, probably a user who'd like some feedback
			utils.sendReponse(res,400, 'This seed is already in our list: ' + seeds[0].url);
			return;
		} 
		if (seedsToAdd.length > 0) {
			seedlistUpdater(type, seedsToAdd, function(success, body) {
				if (success) {
					utils.sendReponse(res, 202, 'Successfully added ' + (seedsToAdd.length == 1? seedsToAdd[0].url: seedsToAdd.length + " seeds") + ' to the seed list');
				} else {
					utils.sendReponse(res, 500, 'Failed to add ' + (seedsToAdd.length == 1? seedsToAdd[0].url: seedsToAdd.length + " seeds") + " to the seed list");
				}
		//		if (req) urlsToAdd.unshift(req.headers["user-agent"]);
		//		utils.logline('addedSeeds.log',urlsToAdd);
			});
		} else {
			console.log("tried to add " + seeds.length + ", but added none. Is something wrong here?");
		}
	});
	
	
//	request.post({url: config.seedlistUpdater.sparqlEndpoint, headers: { "Accept": "application/json"}, form: {query: query}}, function(error, response, body) {
//		
//	});
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
	var parsedUri = null;
	if (args.url) {
	    parsedUri = new iri.IRI(args.url);
		args.url = parsedUri.toURIString().trim();
		args.url = args.url.trim();
	}
	if (!args.url || args.url.length == 0) {
		utils.sendReponse(res, 400, 'No seed item given as argument');
		utils.logline('faultySeeds.log', [req.headers["user-agent"],args.url]);
	} else {
	    if (!parsedUri.scheme()) {
	        utils.sendReponse(res,400, 'The seed item is not a valid URI: ' + args.url);
            utils.logline('faultySeeds.log', [req.headers["user-agent"],args.url]);
	    } else if (!(parsedUri.scheme().toLowerCase() in config.seedlistUpdater.supportedSchemes)) {
	        utils.sendReponse(res,400, 'URIs with scheme "' + parsedUri.scheme() + '" are not yet supported. You can enter a feature request on Github');
            utils.logline('faultySeeds.log', [req.headers["user-agent"],args.url]);
	    } else {
	         if (args.lazy) {
                  addLazySeed(res, args, parsedUri);
                  return;
              } else {
                  addSeeds(req, res, args.type, [{url: parsedUriToString(parsedUri), from: args["from"]}]);
                  
              }
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
		if (lazySeeds.url.length > config.seedlistUpdater.maxSeedlistSize || (latestLazyAdded.url && (new Date() - latestLazyAdded.url) > (config.seedlistUpdater.maxSeedlistTime * 1000))) {
			var urlLazySeeds = lazySeeds.url.slice(0,config.seedlistUpdater.maxSeedlistSize);//clone
			lazySeeds.url = lazySeeds.url.slice(config.seedlistUpdater.maxSeedlistSize);
			
			addSeeds(null,null,"url", urlLazySeeds);
			latestLazyAdded.url = null;
		}
		if (lazySeeds.archive.length > config.seedlistUpdater.maxSeedlistSize || (latestLazyAdded.archive && (new Date() - latestLazyAdded.archive) > (config.seedlistUpdater.maxSeedlistTime * 1000))) {
			var archiveLazySeeds = lazySeeds.archive.slice(0,config.seedlistUpdater.maxSeedlistSize);//clone
			lazySeeds.archive = lazySeeds.archive.slice(config.seedlistUpdater.maxSeedlistSize);
			addSeeds(null,null,"archive", archiveLazySeeds);
			latestLazyAdded.archive = null;
		}
		checkLazyList();//does another sleep
	});
};
checkLazyList();
