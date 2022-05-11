import {EntryHashB64, HeaderHashB64, AgentPubKeyB64, serializeHash} from '@holochain-open-dev/core-types';
import {BaseClient, CellClient} from '@holochain-open-dev/cell-client';
import { writable, Writable, derived, Readable, get } from 'svelte/store';
import { PlaceService } from './place.service';
import {
  DestructuredPlacement,
  Dictionary, PlaceAtInput, PlacementEntry, PlaceProperties, snapshot_to_str,
  Signal, SnapshotEntry, PlacementDetails, destructurePlacement,
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
  private _dnaProperties?: PlaceProperties;


  /** Public */

  /** TimeBucketIndex -> Snapshot */
  //private snapshotStore: Writable<Dictionary<SnapshotEntry>> = writable({});
  snapshotStore: Dictionary<SnapshotEntry> = {};
  /** TimeBucketIndex -> Placement */
  //private placementStore: Writable<Dictionary<PlacementEntry[]>> = writable({});
  placementStore: Dictionary<PlacementDetails[]> = {};


  // public latestBucketIndex: number = 0;
  latestStoredBucketIndex: number = 0;



  /** Static info */

  myAgentPubKey: AgentPubKeyB64;

  /** Readable stores */
  //public snapshots: Readable<Dictionary<SnapshotEntry>> = derived(this.snapshotStore, i => i)
  //public placements: Readable<Dictionary<PlacementEntry[]>> = derived(this.placementStore, i => i)


  /** Ctor */
  constructor(protected hcClient: BaseClient) {
    this.service = new PlaceService(hcClient, "place");
    //let cellClient = this.service.cellClient
    this.myAgentPubKey = this.service.myAgentPubKey;

    // this.service.getProperties().then((properties) => {
    //   this.latestBucketIndex = Math.floor(properties.startTime / properties.bucketSizeSec) - 1;
    // });
  }


  /** */
  async getLatestSnapshot(): Promise<SnapshotEntry | null> {
    const startIndex = this.epochToBucketIndex((await this.getProperties()).startTime)
    let currentBucketIndex = this.epochToBucketIndex(Date.now() / 1000);
    let maybeSnapshot = null;
    do {
      console.log("getLatestSnapshot() - " + currentBucketIndex + " (" + startIndex + ")")
      maybeSnapshot = await this.service.getSnapshotAt(currentBucketIndex);
      currentBucketIndex -= 1;
    } while(maybeSnapshot == null && currentBucketIndex > startIndex)
    if (maybeSnapshot == null) {
      console.warn("getLatestSnapshot(): No snapshot found")
    }
    return maybeSnapshot;
  }


  /**
   * Get latest entries of each type for current time bucket and update local store accordingly
   */
  async pullDht() {
    console.log("pullDht()")

    const latestStoredSnapshot = this.getLatestStoredSnapshot();
    try {
      const latestSnapshot = await this.getLatestSnapshot();
      if (latestSnapshot == null) {
        //console.error("No snapshot found.")
        return;
      }

      let latestStoredIndex = latestStoredSnapshot
        ? latestStoredSnapshot.timeBucketIndex
        //: Math.floor(_dnaProperties.startTime / _dnaProperties.bucketSizeSec) - 1;
        : latestSnapshot.timeBucketIndex - 1;

      console.log("pullDht() latest found: " + latestSnapshot.timeBucketIndex + " | " + latestStoredIndex)
      let count = 0;
      //await this.storeSnapshot(latestSnapshot)
      /** Store all snapshots since last pull */
      while (latestStoredIndex < latestSnapshot.timeBucketIndex) {
        latestStoredIndex += 1;
        const snapshot = await this.service.getSnapshotAt(latestStoredIndex)
        if (snapshot) {
          //console.log("Attempting to store " + snapshot_to_str(snapshot))
          this.storeSnapshot(snapshot)
          count += 1;
        } else {
          console.log("No snapshot found at " + latestStoredIndex)
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

    if (this.latestStoredBucketIndex < snapshot.timeBucketIndex) {
      this.latestStoredBucketIndex = snapshot.timeBucketIndex
    }


    const placements = await this.service.getPlacementsAt(snapshot.timeBucketIndex - 1);
    // this.placementStore.update(store => {
    //   store[snapshot.timeBucketIndex - 1] = placements
    //   return store
    // })

    let details:PlacementDetails[] = []
    for (const placement of placements) {
      let author = await this.service.getPlacementsAuthor(placement.pixel, snapshot.timeBucketIndex - 1);
      author = author? author : "<unknown>"
      details.push({placement: destructurePlacement(placement), author})
    }

    this.placementStore[snapshot.timeBucketIndex - 1] = details

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

  getMaybeProperties(): PlaceProperties | undefined {
    return this._dnaProperties;
  }

  /** WTF */
  async getLocalSnapshots(): Promise<SnapshotEntry[]> {
    const locals = await this.service.getLocalSnapshots();
    for (const local of locals) {
      await this.storeSnapshot(local)
    }
    return locals;
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


  epochToBucketIndex(epochSec: number): number {
    return Math.ceil((epochSec) / this._dnaProperties!.bucketSizeSec);
  }


  /** */
  getLatestStoredSnapshot(): SnapshotEntry | null {
    const stored = Object.values(this.snapshotStore);
    if (stored.length == 0) {
      return null
    }
    let latestSnapshot = this.snapshotStore[this.latestStoredBucketIndex]
    console.log("Latest snapshot in store: " + snapshot_to_str(latestSnapshot));
    return latestSnapshot;
  }


  // snapshot(timeBucketIndex: number): SnapshotEntry {
  //   return get(this.snapshotStore)[timeBucketIndex];
  // }
}
