#!/bin/bash

rustc --version

# temp fix for broken holochain deps
cargo update -p hdi --precise 0.1.3

# install `hc` cli tool
# KEEP THIS IN SYNC
cargo install holochain_cli --version 0.0.60

# install wasm32 compilation target
rustup target install wasm32-unknown-unknown
