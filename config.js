module.exports = {
    fileHosting : {
        port : 8686,
    },
    seedlistUpdater : {
        port : 8989,
        graphApi : "http://127.0.0.1:8890/sparql-graph-crud",
        seedlistGraph : "http://lodlaundromat.org#seedlist",
        washingMachineGraph : "http://lodlaundromat.org#",
        sparqlEndpoint : "http://sparql.backend.lodlaundromat.org",
        maxSeedlistSize : 50,
        maxSeedlistTime : 3600,
        checkLazyListInterval : 60,
        supportedSchemes: {
            'http': true,
            'https': true,
            'ftp': true,
            'sftp': true
        }
    },
    datadumps : {
        totalFile: 'dump',
        extension: ".nt.gz",
        graphs : {
            metrics : function() { return "http://lodlaundromat.org#metrics-" + module.exports.llVersion;},
            main : function() { return "http://lodlaundromat.org#" + module.exports.llVersion;},
	    seedlist: "http://lodlaundromat.org#seedlist",
	    errorOntology: "http://lodlaundromat.org/ontology#error",
	    httpOntology: "http//lodlaundromat.org/ontology#http",
	    llOntology: "http://lodlaundromat.org/ontology#llo",
	    metricsOntology: "http://lodlaundromat.org/ontology#llm"
        }
    },
    notifications : {
        port: 9191,
        checkInterval : 20,
        dbLocation: 'notification.db',
        sparqlEndpoint : "http://sparql.backend.lodlaundromat.org",
        baseUri: "http://notify." + process.env["DOMAIN"] + "/",
        email: 'notification@lodlaundromat.org'
    }
};
