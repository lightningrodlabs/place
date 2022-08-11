# Place

Holochain experimental app to mimic reddit-place (pixel wars)
## Dev testing

### General
1. Install the required tools (or use nix-shell)
    1. [`holochain`](https://github.com/holochain/holochain)
    2. [`hc`](https://github.com/holochain/holochain/tree/develop/crates/hc)
    3. Run `npm run ci:hc-install`
2. Run `npm run hash-zome-install`
3. Build the DNA `npm run build:happ`
4. Install nodejs dependencies `npm install`
5. Build the happ `npm run build`

### holo host (self-hosted)

1. Build the chaperone specific happ: `npm run build:chaperone`
2. Launch the local holo-dev-server: `npm run self-hosted`
3. Launch the happ for chaperone: `npm run start:chaperone`


### holo hosting web environment

1. Build the chaperone specific happ: `npm run build:chaperone`
2. Launch the happ for holo main-net: `npm run start:holo-mainnet`

### Web
`npm run start`

### Electron
`npm run electron`

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

### Folder structure
1. `/electron`: The electron app source code
2. `/electron/web`: Final artifacts for the electron app (includes output from `ui`)
3. `/electron/binaries`: All the binaries we are dependent on on must ship with the app
4. `/ui/lib`: lit-element source code of the ui components
5. `/ui/apps/place`: The "normal" app bundled in electron & web-happ
6. `/ui/apps/place-chaperone`: The app for holo-hosting
7. `/workdir`: dna, happ and web-happ yamls
8. `/zomes`: Integrity and coordinator zomes source code
