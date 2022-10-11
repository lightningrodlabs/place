#!/bin/bash

rustc --version

# install `hc` cli tool
# KEEP THIS IN SYNC
cargo install holochain_cli --version 0.0.60

# install wasm32 compilation target
rustup target install wasm32-unknown-unknown
