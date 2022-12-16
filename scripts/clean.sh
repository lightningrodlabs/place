#!/bin/bash
# TOP LEVEL
#rm -rf submodules
rm .hc_live*
rm hash_zome*
# DNA
rm dna/workdir/place.dna
rm dna/workdir/place.happ
# WEBCOMPONENTS
rm -rf webcomponents/dist
rm webcomponents/tsconfig.tsbuildinfo
# WEB-APP
rm -rf webapp/dist
rm -rf webapp/out-tsc
rm webapp/tsconfig.tsbuildinfo
rm webapp/ui.zip
# WEB-APP CHAPERONE
rm -rf webapp-chaperone/dist
rm -rf webapp-chaperone/out-tsc
rm webapp-chaperone/tsconfig.tsbuildinfo
rm webapp-chaperone/ui-chaperone.zip
# ELECTRON
rm -rf electron/out-builder
rm -rf electron/out-tsc
rm electron/bin/*
rm electron/web/*.js
rm electron/web/*.map
rm electron/web/index.html
rm electron/tsconfig.tsbuildinfo
# WE APPLET
rm -rf we-applet/out-tsc
rm we-applet/.hc_live*
rm we-applet/ui-applet.zip
