#!/bin/bash

NOW=`date +%s`

LINE=`echo startTime: $NOW`
echo $LINE
echo \* Updating startTime in dna/workdir/dna.yaml
sed -i "7s/.*/    ${LINE}/" dna/workdir/dna.yaml

mkdir -p artifacts
hc dna pack dna/workdir -o artifacts/place.dna
hc dna pack dna/workdir_dashboard -o artifacts/place-dashboard.dna
