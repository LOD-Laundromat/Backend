#!/bin/bash


PID=`/sbin/status lodlaundromat-ldf | egrep -oi '([0-9]+)$' | head -n1`;
if [ -n "$PID" ]; then
	echo "Reloading ldf config"
	kill -s SIGHUP $PID;
fi
