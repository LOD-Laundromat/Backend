var config = require('../../config.js'),
	fs = require('fs');
module.exports = {
		sendReponse: function(response, statusCode, reasonPhrase) {
			if (response) {
				response.writeHead(statusCode, {
				  'Content-Length': reasonPhrase.length,
				  'Content-Type': 'text/plain' 
				});
				response.write(reasonPhrase);
				response.end();
			} else {
				console.log("nu http-response: " + statusCode + " - " + reasonPhrase);
			}
		},
		logline: function(filename, messages) {
			fs.appendFile(config.loggingDir + '/' + filename, new Date().toString() + ' - ' + messages.join(' - ') + '\n', function(){});
		},
		/**
		 * warning: does not extens sub objects!
		 */
		extend: function(target) {
			var sources = [].slice.call(arguments,1);
			sources.forEach(function(source) {
				for (var prop in source) {
					target[prop] = source[prop];
				}
			});
			return target;
		} 
};