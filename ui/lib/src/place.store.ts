import {EntryHashB64, HeaderHashB64, AgentPubKeyB64, serializeHash} from '@holochain-open-dev/core-types';
import {BaseClient, CellClient} from '@holochain-open-dev/cell-client';
import { writable, Writable, derived, Readable, get } from 'svelte/store';
import { PlaceService } from './place.service';
import {
  DestructuredPlacement,
  Dictionary, PlacementEntry, PlaceProperties, print_snapshot,
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
  private snapshotStore: Writable<Dictionary<SnapshotEntry>> = writable({});
  /** TimeBucketIndex -> Placement */
  private placementStore: Writable<Dictionary<PlacementEntry[]>> = writable({});

  private latestBucketIndex: number = 0;

  /** Static info */
  myAgentPubKey: AgentPubKeyB64;

  /** Readable stores */
  public snapshots: Readable<Dictionary<SnapshotEntry>> = derived(this.snapshotStore, i => i)
  public placements: Readable<Dictionary<PlacementEntry[]>> = derived(this.placementStore, i => i)


  /** Ctor */
  constructor(protected hcClient: BaseClient) {
    this.service = new PlaceService(hcClient, "place");
    let cellClient = this.service.cellClient
    this.myAgentPubKey = this.service.myAgentPubKey;

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
          // this.service.getSnapshot(snapEh).then(snapshot => {
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
    try {
      const latestSnapshot = await this.service.getLatestSnapshot();
      if (latestSnapshot.timeBucketIndex == 0) {
        console.error("No snapshot found.")
        return;
      }
      console.log("pullDht() latest found: " + latestSnapshot.timeBucketIndex)
      //await this.storeSnapshot(latestSnapshot)
      /** Store all snapshots since last pull */
      while (this.latestBucketIndex < latestSnapshot.timeBucketIndex) {
        this.latestBucketIndex += 1;
        const snapshot = await this.service.getSnapshot(this.latestBucketIndex)
        this.storeSnapshot(snapshot!)
      }
    } catch (e) {
      console.error("No snapshot found")
      console.error({e})
    }
  }


  /** */
  async storeSnapshot(snapshot: SnapshotEntry) {
    this.snapshotStore.update(store => {
      store[snapshot.timeBucketIndex] = snapshot
      return store
    })
    const placements = await this.service.getPlacementsAt(snapshot.timeBucketIndex - 1);
    this.placementStore.update(store => {
      store[snapshot.timeBucketIndex - 1] = placements
      return store
    })

    console.log(`storeSnapshot() bucket ${snapshot.timeBucketIndex}: ${Object.keys(placements).length}`)
  }


  /** */
  async publishLatestSnapshot(): Promise<HeaderHashB64[]> {
    return this.service.publishLatestSnapshot();
  }

  async getProperties(): Promise<PlaceProperties> {
    return this.service.getProperties();
  }

  async getLocalSnapshots(): Promise<SnapshotEntry[]> {
    return this.service.getLocalSnapshots();
  }

  async placePixel(destructured: DestructuredPlacement): Promise<HeaderHashB64> {
    return this.service.placePixel(destructured);
  }

  /** */
  getLatestSnapshot(): SnapshotEntry {
    let latestSnapshot = {
      imageData: new Uint8Array(),
      timeBucketIndex: 0,
    }
    const snapshots = get(this.snapshots)
    console.log("getLatestSnapshot() - " + Object.values(snapshots).length)
    for(const current of Object.values(snapshots)) {
      if (current.timeBucketIndex > latestSnapshot.timeBucketIndex) {
        latestSnapshot = current;
      }
    }
    print_snapshot(latestSnapshot)
    return latestSnapshot;
  }


  // snapshot(timeBucketIndex: number): SnapshotEntry {
  //   return get(this.snapshotStore)[timeBucketIndex];
  // }
}
