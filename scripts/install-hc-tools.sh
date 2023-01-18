#!/bin/bash

rustc --version

# For ts-bindings
# KEEP THIS IN SYNC
cargo install zits --version 1.4.0

# install `hc` cli tool
# KEEP THIS IN SYNC
cargo install holochain_cli --version 0.1.0-beta-rc.2

# install wasm32 compilation target
rustup target install wasm32-unknown-unknown
