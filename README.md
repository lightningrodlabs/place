# Place

Holochain experimental app to mimic reddit-place (pixel wars)
## Dev testing

### Setup
1. Install the required tools 
   1. Rust wasm target: `npm run install:rust` 
   1. [`holochain`](https://github.com/holochain/holochain): `cargo install holochain` (or use nix-shell)
   4. `npm run install:hc`
   3. `npm run install:zits`
4. `npm install`    
5. `npm run install:submodules`
5. `npm run install:hash-zome`

### Web
`npm run devtest`

### Electron
`npm run devtest:electron`

### holo host - OUTDATED (self-hosted)

1. Build the chaperone specific happ: `npm run build:chaperone`
2. Launch the local holo-dev-server: `npm run self-hosted`
3. Launch the happ for chaperone: `npm run start:chaperone`


### holo hosting web environment - OUTDATED

1. Build the chaperone specific happ: `npm run build:chaperone`
2. Launch the happ for holo main-net: `npm run start:holo-mainnet`

## Releasing (manual)

### For Holo host - OUTDATED
After building the dna and chaperone app, the `*.happ` and `ui-chaperone.zip` files will be available in the `/workdir` folder.

### For Launcher - OUTDATED

`npm run build:webapp`
the `*.webhapp` file will be available in the `/workdir` folder.


# DNA
### Properties

```
struct PlaceProperties {
   pub start_time: u64, // Starting time of the Canvas for drawing, in seconds since UNIX_EPOCH
   pub canvas_size: u16, // Canvas size, in pixels
   pub bucket_size_sec: u32, // Size of a time bucket, in seconds
   pub pixels_per_bucket: u16, // Number of pixels allowed per agent per time bucket
   pub snapshot_interval_in_buckets: u16, // Time interval between frame snapshots, in number of time buckets
}
```


### Implementation

Agents creates "Placements" which is the attribution of an indexed color to a {x,y} pixel on the canvas.
"Placements" are limited to 16 colors.
The Canvas is square, with a side's length set by a DNA property.

Time is divided into buckets of size 'bucket_size_sec'.
'bucket_size_sec' is a DNA property which corresponds to the allowed minimum time interval between placements of pixel per agent.
A "time_bucket_index" is the number of buckets since EPOCH.

DNA has a 'start_time' property which is the number of seconds since EPOCH.
It represents the starting time of the 'place'.
At every time bucket a snapshot is made by 'rendering nodes' or self. 
Nodes attempt to render the latest snapshot based on their ordering of pixel placement in that time bucket (i.e. the last agent to place a pixel is the first agent to try, the 2nd latest agent to place a pixel is the 2nd agent to try to render a snapshot, etc). After half of the next bucket's time is elapsed, any node can attempt to render a snapshot, if none exists.
ex: The snapshot at bucket 42 is the result of all placements until bucket 41, included.




A snapshot stores the latest placements for each pixel at a given time bucket.

# Toolchain

 - **UI**: Typescript, Rollup, Lit, svelte-store, holochain-open-dev, pixijs
 - **Electron app**: Typescript, electron-holochain, electron-builder

## Project structure

| Directory                                  | Description                                                                                                                 |
|:-------------------------------------------| :-------------------------------------------------------------------------------------------------------------------------- |
| `/dna/`                                    | DNA source code
| `/electron/`                               | Electron app directory
| &nbsp;&nbsp;&nbsp;&nbsp;`bin/`             | All the binaries we are dependent on and must ship with the app
| &nbsp;&nbsp;&nbsp;&nbsp;`src/`             | The electron app source code
| &nbsp;&nbsp;&nbsp;&nbsp;`web/`             | Final artifacts for the electron app (includes output from `webapp`)
| `/webapp/`                                 | The Place webapp source code
| &nbsp;&nbsp;&nbsp;&nbsp;`webhapp.workdir/` | webhapp work directory
| `/webapp-chaperone/`                       | The Place webapp source code for holo hosting
| `/webcomponents/`                          | The web components source code
| `/we-applet/`                              | The applet for We integration


## License
[![License: CAL 1.0](https://img.shields.io/badge/License-CAL%201.0-blue.svg)](https://github.com/holochain/cryptographic-autonomy-license)

Copyright (C) 2021, Harris-Braun Enterprises, LLC

This program is free software: you can redistribute it and/or modify it under the terms of the license
provided in the LICENSE file (CAL-1.0).  This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
