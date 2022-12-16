#!/bin/bash

NOW=`date +%s`

LINE=`echo startTime: $NOW`
echo $LINE
echo \* Updating startTime in dna/workdir/dna.yaml
sed -i "7s/.*/    ${LINE}/" dna/workdir/dna.yaml

hc dna pack dna/workdir -o dna/workdir/place.dna
