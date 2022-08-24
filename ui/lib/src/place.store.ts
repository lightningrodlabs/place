import {EntryHashB64, ActionHashB64, AgentPubKeyB64} from '@holochain-open-dev/core-types';
import {AgnosticClient, CellClient} from '@holochain-open-dev/cell-client';
import { writable, Writable, derived, Readable, get } from 'svelte/store';
import {PlaceService} from './place.service';
import {
  DestructuredPlacement,
  Dictionary, PlaceAtInput, PlacementEntry, PlaceProperties, snapshot_to_str,
  Signal, SnapshotEntry, PlacementDetails, destructurePlacement, PublishCallback,
} from './types';
import {CellId} from "@holochain/client";


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

  myRankStore: Dictionary<number> = {};
  publisherStore: Dictionary<AgentPubKeyB64[]> = {};

  // public latestBucketIndex: number = 0;
  latestStoredBucketIndex: number = 0;



  /** Static info */

  myAgentPubKey: AgentPubKeyB64;

  /** Readable stores */
  //public snapshots: Readable<Dictionary<SnapshotEntry>> = derived(this.snapshotStore, i => i)
  //public placements: Readable<Dictionary<PlacementEntry[]>> = derived(this.placementStore, i => i)


  /** Ctor */
  constructor(protected client: AgnosticClient, cellId: CellId) {
    this.service = new PlaceService(client, cellId);
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
    //console.log(`searchLatestSnapshot(): ${startRange} - ${endRange} | ${lastKnown}`)
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
    let maybeSnapshot = await this.searchLatestSnapshot(startIndex, nowIndex, this.latestStoredBucketIndex);
    if (maybeSnapshot == null) {
      console.warn("getLatestSnapshot(): No snapshot found. Creating first one.")
      let res = await this.PublishStartingSnapshot();
      return res;
    }
    console.log("getLatestSnapshot(): result = " + maybeSnapshot.timeBucketIndex)
    return maybeSnapshot;
  }


  /** */
  async PublishStartingSnapshot(): Promise<SnapshotEntry> {
    return this.service.PublishStartingSnapshot();
  }


  /**
   * Get latest entries of each type for current time bucket and update local store
   * with all snapshots & placements since last known snapshot
   */
  async publishUpTo(nowIndex: number, cb: PublishCallback, cbData?: any) {
    console.log("publishUpTo() called")
    try {
      const interval = this._dnaProperties!.snapshotIntervalInBuckets;
      const nowSnapshotIndex =  nowIndex - (nowIndex % interval);
      const latestSnapshot = await this.getLatestSnapshot();
      console.log(`publishUpTo()\n - latest: ${latestSnapshot.timeBucketIndex}\n - now: ${nowSnapshotIndex}`)
      let count = 0;
      /** Publish all snapshots since latest until 'now' */
      for (let latestIndex = latestSnapshot.timeBucketIndex; latestIndex < nowSnapshotIndex; latestIndex += interval) {
        const res = await this.service.publishNextSnapshotAt(latestIndex)
        if (res == null) {
          console.error("Failed to publish snapshot " + latestIndex + interval)
          break;
        }
        const newSnapshot = await this.service.getSnapshotAt(latestIndex + interval)
        if (newSnapshot == null) {
          console.error("Failed to get snapshot at " + latestIndex + interval)
          break;
        }
        const authors = await this.service.getPublishersAt(latestIndex + interval)
        console.log("Attempting to store " + snapshot_to_str(newSnapshot!))
        await this.storeSnapshot(newSnapshot!, authors)
        cb(newSnapshot!, cbData)
        count += 1;
      }
      console.log("publishUpTo() added to store: " + count)
      console.log("publishUpTo()    store count: " + Object.values(this.snapshotStore).length)
    } catch (e) {
      console.error("publishUpTo() failed:")
      console.error({e})
    }
  }


  /**
   * Get latest snapshot and placements, publish next snapshot,
   * then publish same snapshot until 'now'
   */
  async publishSameUpTo(nowIndex: number, cb: PublishCallback, cbData?: any) {
    console.log("publishSameUpTo() called")
    try {
      const interval = this._dnaProperties!.snapshotIntervalInBuckets;
      const nowSnapshotIndex =  nowIndex - (nowIndex % interval);
      const latestSnapshot = await this.getLatestSnapshot();
      console.log(`publishSameUpTo()\n - latest: ${latestSnapshot.timeBucketIndex}\n - now: ${nowSnapshotIndex}`)
      /** Publish next snapshot */
      const res = await this.service.publishNextSnapshotAt(latestSnapshot.timeBucketIndex)
      if (res == null) {
        console.error("Failed to publish snapshot " + latestSnapshot.timeBucketIndex + interval)
        return;
      }
      /** Get snapshot and authors */
      const newSnapshot = await this.service.getSnapshotAt(latestSnapshot.timeBucketIndex + interval)
      if (newSnapshot == null) {
        console.error("Failed to get snapshot at " + latestSnapshot.timeBucketIndex + interval)
        return;
      }
      const authors = await this.service.getPublishersAt(latestSnapshot.timeBucketIndex + interval)
      console.log("Attempting to store " + snapshot_to_str(newSnapshot!))
      /** Store it */
      await this.storeSnapshot(newSnapshot!, authors)
      /** Publish same snapshot since latest until 'now' */
      const vec = await this.publishSameSnapshotUpto(latestSnapshot.timeBucketIndex, nowSnapshotIndex)
      cb(newSnapshot!, cbData)
      console.log("publishSameUpTo() added to store: " + vec.length)
      console.log("publishSameUpTo()    store count: " + Object.values(this.snapshotStore).length)
    } catch (e) {
      console.error("publishSameUpTo() failed:")
      console.error({e})
    }
  }


  /**
   * Get latest entries of each type for current time bucket and update local store accordingly
   */
  async pullLatestSnapshotFromDht() {
    console.log("pullLatestSnapshotFromDht() - START")
    //try {
      const latestSnapshot = await this.getLatestSnapshot();

      if (!this.snapshotStore[latestSnapshot.timeBucketIndex]) {
        console.log("pullLatestSnapshotFromDht(): Adding latest snapshot found at " + latestSnapshot.timeBucketIndex)
        const authors = await this.service.getPublishersAt(latestSnapshot.timeBucketIndex)
        await this.storeSnapshot(latestSnapshot, authors)
      } else {
        // n/a
      }
    //   console.log("pullLatestSnapshotFromDht() added to store: " + count)
    //   console.log("pullLatestSnapshotFromDht()    store count: " + Object.values(this.snapshotStore).length)
    // } catch (e) {
    //   console.error("No snapshot found")
    //   console.error({e})
    // }
    //console.log("pullLatestSnapshotFromDht() - DONE")
  }


  /** */
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
    const authors = await this.service.getPublishersAt(bucketIndex)
    await this.storeSnapshot(snapshot, authors);
    return snapshot;
  }


  /** */
  async storeSnapshot(snapshot: SnapshotEntry, authors: AgentPubKeyB64[]) {
    console.log(`storeSnapshot() called for ${snapshot.timeBucketIndex}`)
    this.snapshotStore[snapshot.timeBucketIndex] = snapshot
    this.publisherStore[snapshot.timeBucketIndex] = authors
    // this.snapshotStore.update(store => {
    //   store[snapshot.timeBucketIndex] = snapshot
    //   return store
    // })
    if (this.latestStoredBucketIndex < snapshot.timeBucketIndex) {
      this.latestStoredBucketIndex = snapshot.timeBucketIndex
    }
    //console.log(`Snapshot stored at bucket ${snapshot.timeBucketIndex}`)
  }


  /** */
  async storePlacements(placements: PlacementEntry[], index: number) {
    //     const placements = await this.service.getPlacementsAt(index);
    let details: PlacementDetails[] = []
    for (const placement of placements) {
      let author = await this.service.getPlacementAuthor(placement.pixel, index);
      author = author? author : "<unknown>"
      details.push({placement: destructurePlacement(placement), author})
    }
    this.placementStore[index] = details
    // this.placementStore.update(store => {
    //   store[snapshot.timeBucketIndex - 1] = placements
    //   return store
    // })
    console.log(`Placements stored at bucket ${index} ; new placement(s): ${Object.keys(placements).length}`)
  }


  /** */
  async getProperties(): Promise<PlaceProperties> {
    if (!this._dnaProperties) {
      this._dnaProperties = await this.service.getProperties();
      console.log({dnaProperties: this._dnaProperties})
    }
    return this._dnaProperties;
  }


  /** */
  getMaybeProperties(): PlaceProperties | undefined {
    return this._dnaProperties;
  }


  /** */
  async getLocalSnapshots(): Promise<number[]> {
      const localIndexes = await this.service.getLocalSnapshots();
    return localIndexes;
  }

  /** */
  async placePixel(destructured: DestructuredPlacement): Promise<ActionHashB64> {
    return this.service.placePixel(destructured);
  }


  /** */
  async getPlacementsAt(bucketIndex: number): Promise<PlacementEntry[]> {
    let placements = await this.service.getPlacementsAt(bucketIndex);
    await this.storePlacements(placements, bucketIndex);
    return placements;
  }


  /** */
  async publishNextSnapshotAt(bucket_index: number): Promise<ActionHashB64 | null> {
    console.log("publishNextSnapshotAt() " + bucket_index)
    let res = await this.service.publishNextSnapshotAt(bucket_index);
    console.log("publishNextSnapshotAt() succeeded = " + res != null)
    await this.pullLatestSnapshotFromDht();
    return res;
  }


  /** */
  async publishSameSnapshotUpto(latestKnownBucket: number, nowBucket: number): Promise<ActionHashB64[]> {
    console.log("publishSameSnapshotUpto() " + latestKnownBucket + " .. " + nowBucket);
    let res = await this.service.publishSameSnapshotUpto(latestKnownBucket, nowBucket);
    console.log("publishSameSnapshotUpto() succeeded = " + res != null)
    await this.pullLatestSnapshotFromDht();
    return res;
  }


  /**  FIGURE OUT SNAPSHOT RENDER ORDER */

  /** */
  async publishNextSnapshot(nowSecInput?:number): Promise<ActionHashB64 | null> {
    console.log("publishNextSnapshot() called")
    const nowSec = nowSecInput? nowSecInput : Date.now() / 1000;
    let nowIndex = this.epochToBucketIndex(nowSec)
    nowIndex -= nowIndex % this._dnaProperties!.snapshotIntervalInBuckets;
    const myRenderTime = await this.getMyRenderTime(nowIndex)
    let latestSnapshot = await this.getLatestSnapshot();
    /* Must not already by published */
    if (latestSnapshot.timeBucketIndex >= nowIndex) {
      console.warn(`publishNextSnapshot() Aborted: latest snapshot already published.`)
      return null;
    }
    /* Make sure previous is published */
    while (latestSnapshot.timeBucketIndex < nowIndex - 1) {
      let res = await this.service.publishNextSnapshotAt(latestSnapshot.timeBucketIndex);
      console.log(`publishNextSnapshot() publish (${latestSnapshot.timeBucketIndex}) succeeded = ` + (res != null))
      if (!res) {
        console.warn(`publishNextSnapshot() Aborted. Failed to publish: ${latestSnapshot.timeBucketIndex}`)
        return null;
      }
      latestSnapshot = await this.getLatestSnapshot();
    }
    /*  Must be past our render time to publish */
    // assert(latestSnapshot.timeBucketIndex == nowIndex - 1)
    if (nowSec >= myRenderTime) {
      let res = await this.service.publishNextSnapshotAt(nowIndex - 1);
      console.log("publishNextSnapshot() succeeded = " + (res != null))
      await this.pullLatestSnapshotFromDht();
      return res;
    } else {
      console.warn(`publishNextSnapshot() Aborted: too soon. Index: ${this.getRelativeBucketIndex(nowIndex)}
       -          now: ${nowSec}
       - myRenderTime: ${myRenderTime} (wait: ${myRenderTime - nowSec})`)
    }
    return null;
  }


  /** */
  getMyRankAt(bucketIndex: number): number {
    return this.myRankStore[bucketIndex]
  }

  /** */
  getPublishersAt(bucketIndex: number): AgentPubKeyB64[] {
    return this.publisherStore[bucketIndex]
  }

  /** */
  async getMyRenderTime(bucketIndex: number): Promise<number> {
    const bucketSize = this.getMaybeProperties()!.bucketSizeSec;
    const nextBucketTime = (bucketIndex + 1) * bucketSize;
    const rank = await this.service.getAuthorRank(this.myAgentPubKey, bucketIndex - 1); // Must get rank of previous bucket to determine this bucket's render time
    this.myRankStore[bucketIndex] = rank
    const offset = (rank - 1) * (bucketSize / 10)
    //console.log("MyRank for " + this.getRelativeBucketIndex(bucketIndex) + ", is: " + rank + "; offset = " + offset + " secs")
    if (rank == 0) {
      return nextBucketTime - 2;
    }
    const rankTime = bucketIndex * bucketSize + offset
    return Math.min(nextBucketTime - 2, rankTime)
  }


  /** DEBUGGING */

  async placePixelAt(input: PlaceAtInput): Promise<ActionHashB64> {
    return this.service.placePixelAt(input);
  }


  /** Methods */

  getRelativeBucketIndex(absIndex: number): number {
    if (!this._dnaProperties) return absIndex;
    return absIndex - Math.floor(this._dnaProperties!.startTime / this._dnaProperties!.bucketSizeSec);
  }


  epochToBucketIndex(epochSec: number): number {
    return Math.floor(epochSec / this._dnaProperties!.bucketSizeSec);
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
