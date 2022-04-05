#!/bin/bash

# assumes that dna/workdir/dna/where.dna
# is already pre-compiled and up to date
# In CI this is handled via .github/workflows/release.yml
# where it calls install-hc-tools and and dna-pack

# ensure all necessary binaries are packaged in the app
#rm -rf electron/binaries
#mkdir electron/binaries
cp workdir/place.dna electron/binaries/place.dna
cp workdir/place.happ electron/binaries/place.happ
bash scripts/copy-binaries.sh

# ui
npm run build:ui
