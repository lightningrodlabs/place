#!/bin/bash

hc sandbox clean
# NOTE: the installed-app-id (-a) should also be the INSTALLED_APP_ID in index.js
# ** the ui defaults to elemental-chat:<dna version number>:<uuid> (appId format for holo self-hosted)
hc sandbox generate ./workdir/place.happ -a='place'

