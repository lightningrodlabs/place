#!/bin/bash

NOW=`date +%s`

LINE=`echo startTime: $NOW`
echo $LINE
echo \* Update start_time im workdir/dna.yaml
sed -i "10s/.*/    ${LINE}/" workdir/dna.yaml
echo \* Update start_time im we-applet/workdir/dna.yaml
sed -i "10s/.*/    ${LINE}/" we-applet/workdir/dna.yaml

hc dna pack workdir
