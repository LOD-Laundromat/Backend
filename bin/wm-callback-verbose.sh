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
if [ $size -lt 1500000000 ]; then
	echo "Creating C-LOD file ($1)"
	streamDataset $1
	createModel $1
	storeModel $1
 fi

echo "Notify users"
#do this as a daemon: we need to set this -after- the 'endClean' val has been set (i.e. after this script ends)
# should have a better callback system, but for now, just use this deamon and a sleep function
notify $1 &
exit 0;
