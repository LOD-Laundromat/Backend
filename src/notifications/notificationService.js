var util = require('util'),  
    express = require('express'),
	url = require('url'),
	queryString = require('querystring'),
	utils = require('../utils.js'),
	SimpleDb = require('simple-node-db'),
	validator = require('validator'),
	_ = require('lodash'),
	request = require('superagent'),
	nodemailer = require('nodemailer'),
	nodemailer = require('nodemailer'),
	config = require('../../config.js');


if (!config.notifications.port) throw new Error('No port defined to run notifier on');
if (!config.notifications.checkInterval) throw new Error('No check interval defined to check notifications with');
if (!config.notifications.dbLocation) throw new Error('No db location specified for notifications');
if (!config.notifications.sparqlEndpoint) throw new Error('No sparql endpoint specified for notifications');


var transporter = nodemailer.createTransport();

db = new SimpleDb({path:config.notifications.dbLocation});

var app = express();



app.get('/watch/', function(req,res){
    var query = url.parse(req.url, true).query;
    if (!query.doc) return res.status(400).send('?doc parameter required');
    if (!query.email) return res.status(400).send('?email parameter required');
    if (!validator.isEmail(query.email)) return res.status(400).send('Not a valid email address: ' + query.email);
    
    //first check whether this one is still in the pipeline (if its cleaned already, there is no use watching it)
    
    
    getCleanedDate(query.doc, function(cleaned) {
        if (cleaned) return res.status(409).send('This document was already cleaned at ' + cleaned + '. I.e., no need to watch it');
        db.queryKeys( null, function(err, keys) {
            if (err) return res.status(500).send(err);
            if (_.includes(keys, query.doc)) {
                //update
                db.find(query.doc, function(err, model) {
                    if (err) return res.status(500).send(err);
                    if (model[query.email]) return res.status(409).send('You are already watching this document for changes');
                    model[query.email] = {};
                    db.update(query.doc, model, function(err, model){
                        if (err) return res.status(500).send(err);
                        return res.send("Success");
                    })
                })
                
            } else {
                //insert
                var model = {};
                model[query.email] = {};
                db.insert(query.doc, model, function(err, model){
                    if (err) return res.status(500).send(err);
                    res.send("Success");
                })
            }
        });
    });
    
    
    
    
});

app.get('/unsubscribe/', function(req,res){
    var query = url.parse(req.url, true).query;
    if (!query.email) return res.status(400).send('?email parameter required');
    //loop through documents, and remove watch items for this email
    db.queryKeys( null, function(err, keys) {
        if (err) return res.status(500).send(err);
        if (keys.length == 0) return res.status(200).send('nothing to unsubscribe from');
        var queue = 0;
        var somethingDeleted = false;
        _.forEach(keys, function(key) {
            queue++;
            db.find(key, function(err, model) {
                if (err) return res.status(500).send(err);
                if (model[query.email]) {
                    //remove if this is only entry
                    if (_.size(model) == 1) {
                        db['delete'](key, function(err, model) {
                            if (err) return res.status(500).send(err);
                            queue--;
                            somethingDeleted = true;
                            if (queue <= 0) return res.send('successfully unsubscribed')
                        })
                    } else {
                        delete model[query.email];
                        db.update(key, model, function(err, model) {
                            
                            if (err) return res.status(500).send(err);
                            queue--;
                            somethingDeleted = true;
                            if (queue <= 0) return res.send('successfully unsubscribed')
                        });
                    }
                    //update if there are more entries
                } else {
                    queue--;
                    if (queue <= 0) return res.send(somethingDeleted?'successfully unsubscribed': 'nothing to delete')
                }
            });
        })
    });
});

app.get('/unwatch/', function(req,res){
    var query = url.parse(req.url, true).query;
    if (!query.doc) return res.status(500).send('?doc parameter required');
    if (!query.email) return res.status(500).send('?email parameter required');
    
    db.queryKeys( null, function(err, keys) {
        if (err) return res.status(500).send(err);
        if (_.includes(keys, query.doc)) {
            //update
            db.find(query.doc, function(err, model) {
                if (err) return res.status(500).send(err);
                if (model[query.email]) {
                    if (numEmailsInModel(model) == 1) {
                        db['delete'](query.doc, function(err, model) {
                            if (err) return res.status(500).send(err);
                            return res.send('successfully unwatched')
                        })
                    } else {
                        delete model[query.email];
                        db.update(query.doc, model, function(err, model) {
                            if (err) return res.status(500).send(err);
                            return res.send('successfully unwatched')
                        });
                    }
                } else {
                    return res.status(400).send("document was not watched anyway");
                }
            })
            
        } else {
            return res.status(400).send("document not found");
        }
    });
});
/**
 * i know, i know. Ugly. But this is just for debugging
 */
app.get('/info/', function(req,res){
    var html = '';
    var done = 0;
    db.queryKeys( null, function(err, keys) {
        if (keys.length == 0) res.send('no watches set');
        _.forEach(keys, function(key) {
            db.find(key, function(err, model) {
                if (err) return res.status(500).send(err);
                html += '<h3>' + key + '</h3><pre>' + JSON.stringify(model, null, '\t') + '</pre>';
                done++;
                if (done == keys.length) {
                    res.send('<html><body>' + html + '</body></html>');
                }
            });
        })
    })
});


app.get('/mailInfo/', function(req,res){
    var docs = {};
    var query = url.parse(req.url, true).query;
    if (!query.email) return res.status(400).send('?email parameter required');
    db.queryKeys( null, function(err, keys) {
        if (err) return res.status(500).send(err);
        var queue = 0;
        _.forEach(keys, function(key) {
            queue++;
            db.find(key, function(err, model) {
                if (err) return res.status(500).send(err);
                if (model[query.email]) {
                    docs[key] = true;
                }
                queue--;
                if (queue == 0) {
                    res.send(docs);
                }
            });
        })
    })
});



app.get('/deleteDoc/', function(req,res){
    var query = url.parse(req.url, true).query;
    if (!query.doc) return res.status(500).send('?doc parameter required');
    db['delete'](query.doc, function(err, model) {
        if (err) return res.status(500).send(err);
        return res.send('deleted ' + query.doc);
    });
});



app.get('/check/', function(req, res) {
    var query = url.parse(req.url, true).query;
    var doc = null;
    if (query.doc) {
        doc = query.doc;
    } else if (query.md5) {
        doc = 'http://lodlaundromat.org/resource/' + query.md5;
    }
    db.queryKeys( null, function(err, keys) {
        if (_.includes(keys, doc)) {
            request
                .post(config.notifications.sparqlEndpoint)
                .query({ query: getSparqlQuery(doc)})
                .set('Accept', 'application/json')
                .end(function(err, sparqlRes){
                    if (err && err.status >= 400) return res.status(err.status).send(err.response.text);
                    if (sparqlRes.body.results.bindings.length == 0) return res.send('nothing done yet');
                    var binding = sparqlRes.body.results.bindings[0];
                    if (_.size(binding) == 0) return res.send('nothing done yet');
                    var isArchive = binding.type && binding.type.value == 'http://lodlaundromat.org/ontology/Archive';
                    var emailList = [];
                    
                    //get the email addresses to notify
                    db.find(query.doc, function(err, model) {
                        if (err) return res.status(500).send(err);
                        
                        
                        //loop through email addresses
                        _.forEach(model, function(val, emailAdress) {
                            if (validator.isEmail(emailAdress)) {
                                //check whether there is something to send
                                if (binding['endClean'] && !('endClean' in val)) {
                                    //we should send a notification (this status has not been notified before)
                                    model[emailAdress]['endClean'] = new Date();
                                    db.update(query.doc, model, function(){});
                                    request
                                        .get(config.notifications.baseUri + 'unwatch/')
                                        .query({doc: query.doc})
                                        .query({email: emailAdress})
                                        .end(function(err, sparqlRes){
                                        });
                                    emailList.push(emailAdress);
                                } else {
                                    //only notify on 'clean'. just ignore this one!
                                }
                            }
                        });
                        if (emailList.length == 0) {
                            return res.send('watchers were already notified');
                        } else {
                            sendNotifications(emailList, doc, isArchive, binding['endClean'].value);
                            return res.send('emails send');
                        }
                        
                        
                    })
                    
                });
        } else {
            return res.send('fine. nobody is watching this doc');
        }
    });
    
})


var sendNotifications = function(emails, doc, isArchive, date) {
    
    var entries = {};
    var doSend = function() {

        var jDate = new Date(date);

        var getMainMsg = function(email, html) {
            var mainMsg = '';
            var archiveMsg = 'Note that this file was an archive and contained other '
            if (html) {
                mainMsg = '<p><a href="' + doc + '" target="_blank">' + doc
                        + '</a> finished cleaning at ' + jDate + '<p>';
                if (_.size(entries) > 0) {
                    
                    mainMsg += '<p>Note that this file was an archive and contained other entries which are queued for cleaning. The list includes:<ul>';
                    _.forEach(entries, function(path, entry) {
                        subscribeLink = config.notifications.baseUri + 'watch/?email=' + encodeURIComponent(email) + '&doc=' + encodeURIComponent(entry);
                        mainMsg += '<li><a href="' + entry + '" target="_blank">' + path + '</a> <a href="' + subscribeLink + '" target="_blank" style="font-style: italic;font-size:x-small">Notify me on changes</a>';
                    });
                    mainMsg += '</ul></p>';
                }
                    
                mainMsg += '</p>';
            } else {
                mainMsg = doc + ' finished cleaning at ' + jDate + '.';
            }
            return mainMsg;
        }
        var getSubMsg = function(email, html) {
            var unsubscribeLink = config.notifications.baseUri + 'unsubscribe/?email=' + encodeURIComponent(email);
            var subMsg = 'To unsubscribe from all LOD Laundromat email message, click ';
            if (html) {
                subMsg = '<hr><p style="font-size:small;color:#666">' + subMsg
                        + '<a href="' + unsubscribeLink
                        + '" target="_blank">here</a></p>';
            } else {
                subMsg += unsubscribeLink;
            }
            return subMsg;
        };

        // Action does not work (see
        // https://developers.google.com/gmail/markup/registering-with-google for
        // requirements)
        // still keep this here, perhaps for future use
        var emailAction = '<div itemscope itemtype="http://schema.org/EmailMessage">\
          <div itemprop="action" itemscope itemtype="http://schema.org/ViewAction">\
            <link itemprop="url" href="'
                    + doc
                    + '"></link>\
            <meta itemprop="name" content="View Document"></meta>\
          </div>\
          <meta itemprop="description" content="View this LOD Laundromat Document"></meta>\
        </div>';
        
        _.forEach(emails, function(email) {
            transporter.sendMail({
                from : config.notifications.email,
                to : email,
                subject : '[LOD Laundromat] ' + doc + ' status change',
                text : getMainMsg(email) + '\n\n' + getSubMsg(email),
                html : getMainMsg(email, true) + getSubMsg(email, true) + emailAction
            });
        })
    }
    
    if (isArchive) {
        request
            .post(config.notifications.sparqlEndpoint)
            .query({ query: getEntriesQuery(doc)})
            .set('Accept', 'application/json')
            .end(function(err, sparqlRes){
                if (err && err.status >= 400) return doSend();
                if (sparqlRes.body.results.bindings.length == 0) return doSend();//no entries
                _.forEach(sparqlRes.body.results.bindings, function(binding) {
                    if (binding.entry && binding.entry.value) {
                        entries[binding.entry.value] = binding.path.value;
                    } 
                });
                doSend();
            })
    } else {
        doSend();
    }
    
    
};


var server = app.listen(config.notifications.port, function () {
    console.log('> Notification backend running on ' + config.notifications.port)
})

var prologue = "PREFIX ll: <http://lodlaundromat.org/resource/>\n\
PREFIX llo: <http://lodlaundromat.org/ontology/>\n";
var getCleanedDate = function(doc, callback) {
    var query = prologue + ' SELECT * WHERE {<'+doc+'> llo:endClean ?endClean} LIMIT 1';
    request
        .post(config.notifications.sparqlEndpoint)
        .query({ query: query})
        .set('Accept', 'application/json')
        .end(function(err, sparqlRes){
            if (err && err.status >= 400) return callback(null);
            if (sparqlRes.body.results.bindings.length == 0) return callback(null);
            var binding = sparqlRes.body.results.bindings[0];
            return callback(new Date(binding.endClean.value));
        })
}

var numEmailsInModel = function(model) {
    var numEmails = 0;
    _.forEach(model, function(val, key) {
       if (key.indexOf('@') >= 0) {
           numEmails++;
       }  
    })
    return numEmails;
}




var getSparqlQuery = function(doc) {
    var getOptional = function(pred, obj) {
        return 'OPTIONAL{<' + doc + '> ' + pred + ' ' + obj + ' .}\n';
    }
    var query = prologue + ' SELECT * WHERE {\n';
    query += getOptional('llo:startUnpack', '?startUnpack');
    query += getOptional('llo:endUnpack', '?endUnpack');
    query += getOptional('llo:startClean', '?startClean');
    query += getOptional('llo:endClean', '?endClean');
    query += getOptional('a', '?type');
    query += '} limit 1';
    return query;
}
var getEntriesQuery = function(archiveDoc) {
    var query = prologue + ' SELECT DISTINCT ?entry ?path WHERE {\n';
    query += '<' + archiveDoc + '> llo:containsEntry ?entry .\n';
    query += '  ?entry llo:path ?path .';
    //query += 'MINUS{<' + archiveDoc + '> llo:endClean []}'
    query += '}';
    return query;
}
