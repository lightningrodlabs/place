import {EntryHashB64, HeaderHashB64, AgentPubKeyB64, serializeHash} from '@holochain-open-dev/core-types';
import {BaseClient, CellClient} from '@holochain-open-dev/cell-client';
import { writable, Writable, derived, Readable, get } from 'svelte/store';
import { PlaceService } from './place.service';
import {
  DestructuredPlacement,
  Dictionary, PlaceAtInput, PlacementEntry, PlaceProperties, snapshot_to_str,
  Signal, SnapshotEntry,
} from './types';

import {CellId} from "@holochain/client/lib/types/common";


const areEqual = (first: Uint8Array, second: Uint8Array) =>
      first.length === second.length && first.every((value, index) => value === second[index]);


/**
 *
 */
export class PlaceStore {
  /** Private */
  private service : PlaceService

  /** TimeBucketIndex -> Snapshot */
  //private snapshotStore: Writable<Dictionary<SnapshotEntry>> = writable({});
  snapshotStore: Dictionary<SnapshotEntry> = {};
  /** TimeBucketIndex -> Placement */
  //private placementStore: Writable<Dictionary<PlacementEntry[]>> = writable({});
  placementStore: Dictionary<PlacementEntry[]> = {};


  // public latestBucketIndex: number = 0;

  public _dnaProperties?: PlaceProperties;

  /** Static info */
  myAgentPubKey: AgentPubKeyB64;

  /** Readable stores */
  //public snapshots: Readable<Dictionary<SnapshotEntry>> = derived(this.snapshotStore, i => i)
  //public placements: Readable<Dictionary<PlacementEntry[]>> = derived(this.placementStore, i => i)


  /** Ctor */
  constructor(protected hcClient: BaseClient) {
    this.service = new PlaceService(hcClient, "place");
    let cellClient = this.service.cellClient
    this.myAgentPubKey = this.service.myAgentPubKey;

    // this.service.getProperties().then((properties) => {
    //   this.latestBucketIndex = Math.floor(properties.startTime / properties.bucketSizeSec) - 1;
    // });

    cellClient.addSignalHandler( appSignal => {
      if (! areEqual(cellClient.cellId[0],appSignal.data.cellId[0]) || !areEqual(cellClient.cellId[1], appSignal.data.cellId[1])) {
        return
      }
      const signal = appSignal.data.payload
      //if (signal.message.type != "Ping" && signal.message.type != "Pong") {
      //  console.debug(`SIGNAL: ${signal.message.type}`, appSignal)
      //}
      // Send pong response
      if (signal.message.type != "Pong") {
        //console.log("PONGING ", payload.from)
        const pong: Signal = {
          maybeSpaceHash: signal.maybeSpaceHash,
          from: this.myAgentPubKey,
          message: {type: 'Pong', content: this.myAgentPubKey}
        };
        // FIXME
        // this.service.notify(pong, [signal.from])
      }
      // Handle signal
      switch(signal.message.type) {
        case "Ping":
        case "Pong":
          break;
        case "NewSnapshot":
          // const snapEh = signal.message.content
          // this.service.getSnapshotAt(snapEh).then(snapshot => {
          //   this.snapshotStore.update(store => {
          //     store[snapEh] = snapshot
          //     return store
          //   })
          // })
          break;
        case "NewPlacement":
          // const eh = signal.message.content
          // this.service.getPlacement(eh).then(placement => {
          //   this.placementStore.update(store => {
          //     store[eh] = placement
          //     return store
          //   })
          // })
          break;
      }
    })
  }

  /** FIXME */
  pingOthers(spaceHash: EntryHashB64, myKey: AgentPubKeyB64) {
    const ping: Signal = {maybeSpaceHash: spaceHash, from: this.myAgentPubKey, message: {type: 'Ping', content: myKey}};
    // console.log({signal})
    //this.service.notify(ping, this.others());
  }


  /** Get latest entries of each type for current time bucket and update local store accordingly */
  async pullDht() {
    console.log("pullDht()")
    // if (this.latestBucketIndex == 0) {
    //const dnaProperties = await this.getProperties();
    // }

    const storedLatest = this.getStoredLatestSnapshot();

    try {
      const latestSnapshot = await this.service.getLatestSnapshot();
      if (latestSnapshot.timeBucketIndex == 0) {
        console.error("No snapshot found.")
        return;
      }
      let storedLatestIndex = storedLatest
        ? storedLatest.timeBucketIndex
        //: Math.floor(dnaProperties.startTime / dnaProperties.bucketSizeSec) - 1;
        : latestSnapshot.timeBucketIndex - 1;

      console.log("pullDht() latest found: " + latestSnapshot.timeBucketIndex + " | " + storedLatestIndex)
      let count = 0;
      //await this.storeSnapshot(latestSnapshot)
      /** Store all snapshots since last pull */
      while (storedLatestIndex < latestSnapshot.timeBucketIndex) {
        storedLatestIndex += 1;
        const snapshot = await this.service.getSnapshotAt(storedLatestIndex)
        if (snapshot) {
          console.log("Attempting to store " + snapshot_to_str(snapshot))
          this.storeSnapshot(snapshot!)
          count += 1;
        } else {
          console.log("No snapshot found at " + storedLatestIndex)
        }
      }
      console.log("pullDht() added to store: " + count)
      console.log("pullDht()    store count: " + Object.values(this.snapshotStore).length)
    } catch (e) {
      console.error("No snapshot found")
      console.error({e})
    }
  }


  /** */
  async storeSnapshot(snapshot: SnapshotEntry) {
    this.snapshotStore[snapshot.timeBucketIndex] = snapshot
    // this.snapshotStore.update(store => {
    //   store[snapshot.timeBucketIndex] = snapshot
    //   return store
    // })

    const placements = await this.service.getPlacementsAt(snapshot.timeBucketIndex - 1);
    // this.placementStore.update(store => {
    //   store[snapshot.timeBucketIndex - 1] = placements
    //   return store
    // })
    this.placementStore[snapshot.timeBucketIndex - 1] = placements

    console.log(`storeSnapshot() bucket ${snapshot.timeBucketIndex}: ${Object.keys(placements).length}`)
  }


  /** */
  async publishLatestSnapshot(): Promise<HeaderHashB64[]> {
    const res = await this.service.publishLatestSnapshot();
    await this.pullDht()
    return res;
  }

  async getProperties(): Promise<PlaceProperties> {
    if (!this._dnaProperties) {
      this._dnaProperties = await this.service.getProperties();
    }
    return this._dnaProperties;
  }

  async getLocalSnapshots(): Promise<SnapshotEntry[]> {
    return this.service.getLocalSnapshots();
  }

  async placePixel(destructured: DestructuredPlacement): Promise<HeaderHashB64> {
    return this.service.placePixel(destructured);
  }

  async getPlacementsAt(bucketIndex: number): Promise<PlacementEntry[]> {
    return this.service.getPlacementsAt(bucketIndex);
  }

  /** DEBUGGING */

  async placePixelAt(input: PlaceAtInput): Promise<HeaderHashB64> {
    return this.service.placePixelAt(input);
  }

  async publishSnapshotAt(bucket_index: number): Promise<HeaderHashB64[]> {
    let res = await this.service.publishSnapshotAt(bucket_index);
    await this.pullDht();
    return res;
  }


  /** Methods */

  getRelativeBucketIndex(absIndex: number): number {
    if (!this._dnaProperties) return absIndex;
    return absIndex - Math.floor(this._dnaProperties!.startTime / this._dnaProperties!.bucketSizeSec);
  }

  /** */
  getStoredLatestSnapshot(): SnapshotEntry | null {
    const stored = Object.values(this.snapshotStore);
    if (stored.length == 0) {
      return null
    }

    let latestSnapshot = {
      imageData: new Uint8Array(),
      timeBucketIndex: 0,
    }
    //const snapshots = get(this.snapshots)
    //console.log("getStoredLatestSnapshot() - count: " + Object.values(snapshots).length)

    for(const current of stored) {
      if (current.timeBucketIndex > latestSnapshot.timeBucketIndex) {
        latestSnapshot = current;
      }
    }

    console.log("Latest in store: " + snapshot_to_str(latestSnapshot));
    return latestSnapshot;
  }


  // snapshot(timeBucketIndex: number): SnapshotEntry {
  //   return get(this.snapshotStore)[timeBucketIndex];
  // }
}
