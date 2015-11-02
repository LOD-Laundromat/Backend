#!/bin/bash
[ -z "$1" ] && echo "No md5 provided as argument" && exit 1;

[ ! ${#1} -eq "32" ] && echo "Argument not an md5" && exit 1; 

query="DELETE { GRAPH <http://lodlaundromat.org#seedlist> {  <http://lodlaundromat.org/resource/$1> ?pred ?obj }} WHERE { GRAPH <http://lodlaundromat.org#seedlist> {   <http://lodlaundromat.org/resource/$1> ?pred ?obj }}"



isql  exec="SPARQL $query"
