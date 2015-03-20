#!/bin/bash
[ -z "$1" ] && echo "No dataset dir provided as argument" && exit 1;
sleep 5;
md5=`basename $1`
curl http://notify.lodlaundromat.d2s.labs.vu.nl/check?md5=$md5

exit 0;
