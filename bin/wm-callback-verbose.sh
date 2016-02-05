#!/bin/bash
hdtQueue="$TMP_DIR/hdtQueue.txt"

[ -z "$1" ] && echo "No dataset provided as argument" && exit 1;
md5=`pathToMd5 $1`

echo "Generating HDT file ($1)"
makeHdt $1

#queue hdt file for ldf update
echo $1 >> $hdtQueue;

echo "Creating C-LOD file ($1)"
streamDataset $1
echo "Creating model"
createModel $1
echo "Storing model"
storeModel $1

echo "Adding provenance to SPARQL"
updateModelsViaSparql




echo "Adding dataset to rocksdb index"
subPath=`md5ToPath $md5`
addDatasetToRocksdb.js $METRIC_DIR/$subPath;


#echo "Adding dataset literals to elasticsearch"
#incremental_index.sh http://download.lodlaundromat.org/$md5

echo "Notify users"
#do this as a daemon: we need to set this -after- the 'endClean' val has been set (i.e. after this script ends)
# should have a better callback system, but for now, just use this deamon and a sleep function
notify $1 &
exit 0;
