module.exports = {
    llVersion : 11,
    loggingDir : "/home/lodlaundromat/log",
    fileHosting : {
        port : 8686,
        dataDir : "/scratch/lodlaundromat/",
    },
    seedlistUpdater : {
        port : 8989,
        graphApi : "http://localhost/sparql/graph",
        seedlistGraph : "http://lodlaundromat.org#seedlist",
        washingMachineGraph : "http://lodlaundromat.org#",
        sparqlEndpoint : "http://sparql.backend.lodlaundromat.org",
        maxSeedlistSize : 50,
        maxSeedlistTime : 10,
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
        dumpLocation : "/scratch/lodlaundromat/dumps/",
        graphs : {
            metrics : function() { return "http://lodlaundromat.org#metrics-" + module.exports.llVersion;},
            main : function() { return "http://lodlaundromat.org#" + module.exports.llVersion;},
	    seedlist: "http://lodlaundromat.org#seedlist",
	    errorOntology: "http://lodlaundromat.org/ontology#error",
	    httpOntology: "http//lodlaundromat.org/ontology#http",
	    llOntology: "http://lodlaundromat.org/ontology#llo",
	    metricsOntology: "http://lodlaundromat.org/ontology#llm"
        }
    }
};
