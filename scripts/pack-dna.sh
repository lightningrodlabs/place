#!/bin/bash

set -e

# Script for copying holochain-runner binary to electron bin folder (used for distributing electron app)

echo Executing \"$0\".

# Check pre-conditions
if [ $# != 1 ]; then
  echo 1>&2 "$0: Aborting. Missing argument: bin folder path"
  exit 2
fi

NOW=`date +%s`

LINE=`echo startTime: $NOW`
echo $LINE
echo \* Updating startTime in dna/workdir/dna.yaml
sed -i "7s/.*/    ${LINE}/" dna/workdir/dna.yaml

mkdir -p artifacts
$1/hc dna pack dna/workdir -o artifacts/place.dna
$1/hc dna pack dna/workdir_dashboard -o artifacts/place-dashboard.dna
