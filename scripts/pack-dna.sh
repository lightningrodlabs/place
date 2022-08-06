#!/bin/bash

NOW=`date +%s`

LINE=`echo startTime: $NOW`
echo \* Extract start_time from workdir/dna.yaml
echo $LINE
sed -i "8s/.*/    ${LINE}/" workdir/dna.yaml

hc dna pack workdir
