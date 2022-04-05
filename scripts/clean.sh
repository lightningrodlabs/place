#!/bin/bash

rm -rf .hc*

#rm -rf electron/binaries
#rm -rf electron/node_modules
#rm -rf electron/node_modules
#rm -rf electron/dist
#rm -rf electron/out
#rm electron/package-lock.json

rm -rf node_modules
#rm -rf test/node_modules
rm -rf ui/lib/node_modules

rm -rf ui/apps/place/node_modules/
rm -rf ui/apps/place/dist/
rm -rf ui/apps/place/out-tsc/

rm package-lock.json
rm ui/lib/package-lock.json
rm ui/apps/place/package-lock.json
