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
import {delay} from "./elements/place-controller";


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

  getStartIndex(): number {
    const properties = this.getMaybeProperties();
    return this.epochToBucketIndex(properties!.startTime);
  }

  /** We assume that a snapshot at each bucket should be published */
  async searchLatestSnapshot(startRange: number, endRange: number, lastKnown: number): Promise<SnapshotEntry | null> {
    console.log(`searchLatestSnapshot(): ${startRange} - ${endRange} | ${lastKnown}`)
    /* End condition: No range left */
    if (startRange == endRange) {
      if (lastKnown == 0) {
        return null;
      }
      return await this.service.getSnapshotAt(lastKnown);
    }
    /* Binary search */
    let candidatIndex = (startRange + endRange) >> 1;
    let maybeSnapshot = await this.service.getSnapshotAt(candidatIndex);
    if (maybeSnapshot) {
      if (candidatIndex == startRange) {
        endRange = endRange - 1
      }
      return await this.searchLatestSnapshot(candidatIndex, endRange, candidatIndex);
    }
    return await this.searchLatestSnapshot(startRange, candidatIndex, lastKnown)
  }

  /** */
  async getLatestSnapshot(): Promise<SnapshotEntry> {
    console.log("getLatestSnapshot(): called")
    const startIndex = this.epochToBucketIndex((await this.getProperties()).startTime)
    let nowIndex = this.epochToBucketIndex(Date.now() / 1000);
    let maybeNow = await this.getSnapshotAt(nowIndex);
    if (maybeNow) {
      return maybeNow;
    }
    let maybeSnapshot = await this.searchLatestSnapshot(startIndex, nowIndex, 0);
    if (maybeSnapshot == null) {
      console.warn("getLatestSnapshot(): No snapshot found. Creating first one.")
      let res = await this.PublishStartingSnapshot();
      return res;
    }
    console.log("getLatestSnapshot(): result = " + maybeSnapshot.timeBucketIndex)
    return maybeSnapshot;
  }

  async PublishStartingSnapshot(): Promise<SnapshotEntry> {
    return this.service.PublishStartingSnapshot();
  }

  /**
   * Get latest entries of each type for current time bucket and update local store
   * with all snapshots & placements since last known snapshot
   */
  async publishUpTo(nowIndex: number) {
    console.log("publishUpTo()")

    try {
      const latestChainedSnapshot = await this.getLatestSnapshot();

      console.log(`publishUpTo()\n - latest chained: ${latestChainedSnapshot.timeBucketIndex}\n - now: ${nowIndex}`)
      let count = 0;
      //await this.storeSnapshot(latestSnapshot)
      /** Store all snapshots since last pull */

      for (let latestChainedIndex = latestChainedSnapshot.timeBucketIndex; latestChainedIndex < nowIndex; latestChainedIndex += 1) {
        // const snapshot = await this.service.getSnapshotAt(latestChainedIndex)
        // if (!snapshot) {
        //   console.log("Snapshot not found at " + latestChainedIndex)
        //   break;
        // }
        const res = await this.service.publishNextSnapshotAt(latestChainedIndex)
        if (res == null) {
          console.error("Failed to publish snapshot " + latestChainedIndex + 1)
          break;
        }
        const newSnapshot = await this.service.getSnapshotAt(latestChainedIndex + 1)
        if (newSnapshot == null) {
          console.error("Failed to get snapshot at " + latestChainedIndex + 1)
          break;
        }
        console.log("Attempting to store " + snapshot_to_str(newSnapshot!))
        await this.storeSnapshot(newSnapshot!)
        count += 1;
      }
      console.log("publishUpTo() added to store: " + count)
      console.log("publishUpTo()    store count: " + Object.values(this.snapshotStore).length)
    } catch (e) {
      console.error("No snapshot found")
      console.error({e})
    }
  }

  /**
   * Get latest entries of each type for current time bucket and update local store accordingly
   */
  async pullDht() {
    console.log("pullDht()")
    //try {
      const latestSnapshot = await this.getLatestSnapshot();

      if (!this.snapshotStore[latestSnapshot.timeBucketIndex]) {
        console.log("pullDht(): Adding latest snapshot found at " + latestSnapshot.timeBucketIndex)
        await this.storeSnapshot(latestSnapshot)
      } else {
        // n/a
      }
    //   console.log("pullDht() added to store: " + count)
    //   console.log("pullDht()    store count: " + Object.values(this.snapshotStore).length)
    // } catch (e) {
    //   console.error("No snapshot found")
    //   console.error({e})
    // }
  }


  async getSnapshotAt(bucketIndex: number): Promise<SnapshotEntry | null> {
    const maybeStored = this.snapshotStore[bucketIndex];
    if (maybeStored) {
      return maybeStored;
    }
    /** look foor snapshot in DHT */
    const snapshot = await this.service.getSnapshotAt(bucketIndex);
    if (snapshot == null) {
      return null;
    }
    await this.storeSnapshot(snapshot);
    return snapshot;
  }


  /** */
  async storeSnapshot(snapshot: SnapshotEntry) {
    console.log(`storeSnapshot() called for ${snapshot.timeBucketIndex}`)

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

    console.log(`Snapshot stored at bucket ${snapshot.timeBucketIndex} ; new placement(s): ${Object.keys(placements).length}`)
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
    console.log("getLocalSnapshots(): storing " + locals.length + " local snapshots")
    await delay(100); // minor delay to avoid "source chain head has moved" error
    for (const local of locals) {
      await this.storeSnapshot(local)
    }
    console.log("getLocalSnapshots() - DONE");
    return locals;
  }

  async placePixel(destructured: DestructuredPlacement): Promise<HeaderHashB64> {
    return this.service.placePixel(destructured);
  }

  async getPlacementsAt(bucketIndex: number): Promise<PlacementEntry[]> {
    return this.service.getPlacementsAt(bucketIndex);
  }

  async publishNextSnapshotAt(bucket_index: number): Promise<HeaderHashB64 | null> {
    console.log("publishNextSnapshotAt() " + bucket_index)
    let res = await this.service.publishNextSnapshotAt(bucket_index);
    console.log("publishNextSnapshotAt() succeeded = " + res != null)
    await this.pullDht();
    return res;
  }

  /** DEBUGGING */

  async placePixelAt(input: PlaceAtInput): Promise<HeaderHashB64> {
    return this.service.placePixelAt(input);
  }


  /** Methods */

  getRelativeBucketIndex(absIndex: number): number {
    if (!this._dnaProperties) return absIndex;
    return absIndex - Math.floor(this._dnaProperties!.startTime / this._dnaProperties!.bucketSizeSec);
  }


  epochToBucketIndex(epochSec: number): number {
    return Math.floor((epochSec) / this._dnaProperties!.bucketSizeSec);
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
