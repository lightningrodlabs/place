#!/bin/bash

# Script for updating version number across the code base

# Check pre-conditions
if [ $# != 1 ]; then
  echo 1>&2 "$0: Aborting. Missing argument: new version number"
  exit 2
fi


# Change electron/package.json
OLD_VER=`awk -F ":" '/"version"/ {print $2}' ./electron/package.json | sed 's/"//g' | sed 's/,//g' | sed 's/ //g'`
echo "./electron/package.json $OLD_VER -> $1"
sed -i "s/\"version\": \"$OLD_VER\"/\"version\": \"$1\"/" ./electron/package.json

# Change we-applet/package.json
OLD_VER=`awk -F ":" '/"version"/ {print $2}' ./we-applet/package.json | sed 's/"//g' | sed 's/,//g' | sed 's/ //g'`
echo "./we-applet/package.json $OLD_VER -> $1"
sed -i "s/\"version\": \"$OLD_VER\"/\"version\": \"$1\"/" ./we-applet/package.json

# Change webcomponents/package.json
OLD_VER=`awk -F ":" '/"version"/ {print $2}' ./webcomponents/package.json | sed 's/"//g' | sed 's/,//g' | sed 's/ //g'`
echo "./webcomponents/package.json $OLD_VER -> $1"
sed -i "s/\"version\": \"$OLD_VER\"/\"version\": \"$1\"/" ./webcomponents/package.json

# Change webapp/package.json
OLD_VER=`awk -F ":" '/"version"/ {print $2}' ./webapp/package.json | sed 's/"//g' | sed 's/,//g' | sed 's/ //g'`
echo "./webapp/package.json $OLD_VER -> $1"
sed -i "s/\"version\": \"$OLD_VER\"/\"version\": \"$1\"/" ./webapp/package.json

# Change .github/workflows/release.yml
OLD_VER=`awk -F ": " '/PLACE_VERSION/{print $2}' ./.github/workflows/release.yml`
echo "./.github/workflows/release.yml '$OLD_VER' -> '$1'"
sed -i "s/$OLD_VER/$1/" ./.github/workflows/release.yml

# Change .github/workflows/test.yml
OLD_VER=`awk -F ": " '/PLACE_VERSION/ {print $2}' ./.github/workflows/test.yml`
echo "./.github/workflows/test.yml '$OLD_VER' -> '$1'"
sed -i "s/$OLD_VER/$1/" ./.github/workflows/test.yml


# Change electron/web/splashscreen.html
LINE=`echo version $1`
echo $LINE
sed -i "17s/.*/            ${LINE}/" electron/web/splashscreen.html
