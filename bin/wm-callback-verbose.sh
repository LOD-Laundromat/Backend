#!/bin/bash
hdtQueue="/scratch/lodlaundromat/tmp/hdtQueue.txt"
#touch /home/lodlaundromat/wm-callback.touch
[ -z "$1" ] && echo "No dataset provided as argument" && exit 1;
md5=`basename $1`
echo "Generating HDT file ($1)"
makeHdt $1

#queue hdt file for ldf update
echo $1 >> $hdtQueue;

#analyze directory (for now, only for gzipped files smaller than 1.5 Gb. had some scalability issues)
size=`stat --printf="%s" $1/clean.*.gz`
#if [ $size -lt 1500000000 ]; then
	echo "Creating C-LOD file ($1)"
	streamDataset $1
	echo "Creating model"
	createModel $1
	echo "Storing model"
	storeModel $1
#else
	echo "doing only lightweight clod analysis"
	streamDatasetLight $1
#fi

echo "Adding provenance to SPARQL"
updateModelsViaSparql




echo "Adding dataset to rocksdb index"
node ~/Git/anytime/node/addDatasetToRocksdb.js $METRIC_DIR/$md5;


echo "Adding dataset literals to elasticsearch"
/home/lodlaundromat/Git/frank_elasticsearch/incremental_index.sh http://download.lodlaundromat.org/$md5

echo "Notify users"
#do this as a daemon: we need to set this -after- the 'endClean' val has been set (i.e. after this script ends)
# should have a better callback system, but for now, just use this deamon and a sleep function
notify $1 &
exit 0;
