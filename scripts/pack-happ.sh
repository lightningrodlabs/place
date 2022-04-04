#!/bin/bash

# Compile the WASM
cargo build --release --target wasm32-unknown-unknown
# test zome
hc dna pack --output=secret.dna example_dna/dna
hc app pack --output=secret.happ example_dna/dna
