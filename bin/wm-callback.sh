#!/bin/bash
[ -z "$1" ] && echo "No dataset provided as argument" && exit 1;

renice -n 10 $$
wm-callback-verbose.sh $1 >> $LOG_DIR/wmCallback.log 2>> $LOG_DIR/wmCallback.err;
