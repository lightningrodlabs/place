#!/bin/bash

set -e

zits --default-zome-name zPlace -i dna/zomes/place_model -i dna/zomes/place_integrity -i dna/zomes/place -o webcomponents/src/bindings/place.ts
zits --default-zome-name zPlaceDashboard -i dna/zomes/place_model -i dna/zomes/place_dashboard_integrity -i dna/zomes/place_dashboard -o webcomponents/src/bindings/place-dashboard.ts
