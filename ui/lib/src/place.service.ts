import {AgnosticClient} from '@holochain-open-dev/cell-client';
import { EntryHashB64, ActionHashB64, AgentPubKeyB64 } from '@holochain-open-dev/core-types';
import { serializeHash } from '@holochain-open-dev/utils';

import {
  PlacementEntry,
  SnapshotEntry,
  HoloHashed,
  Signal,
  Dictionary, DestructuredPlacement, PlaceProperties, PlaceAtInput, PlacementAuthorInput,
} from './types';
import {CellId, InstalledAppInfo} from "@holochain/client";

export class PlaceService {

  /** Ctor */
  constructor(public agnosticClient: AgnosticClient, public cellId: CellId /*, protected roleId: string*/) {
    // let maybe_cell = hcClient.cellDataByRoleId(roleId);
    // if (!maybe_cell) {
    //   throw new Error("Cell not found for role: " + roleId);
    // }
    //this.agnosticClient = client
  }


  /** Fields */

  //agnosticClient: AgnosticClient


  /** Methods */

  get myAgentPubKey() : AgentPubKeyB64 {
    return serializeHash(this.cellId[1]);
    //return this.agentId
  }


  /** Zome API */

  async getProperties(): Promise<PlaceProperties> {
    return this.callPlaceZome('get_properties', null);
  }

  async publishSameSnapshotUpto(latestKnownBucket: number, nowBucket: number): Promise<ActionHashB64[]> {
    return this.callPlaceZome('publish_same_snapshot_upto', {latestKnownBucket, nowBucket});
  }

  async publishNextSnapshotAt(bucket_index: number): Promise<ActionHashB64 | null> {
    return this.callPlaceZome('publish_next_snapshot_at', bucket_index);
  }

  async getSnapshotAt(bucket_index: number): Promise<SnapshotEntry | null> {
    return this.callPlaceZome('get_snapshot_at', bucket_index);
  }

  async getPublishersAt(bucket_index: number): Promise<AgentPubKeyB64[]> {
    return this.callPlaceZome('get_publishers_at', bucket_index);
  }

  async getLocalSnapshots(): Promise<number[]> {
    return this.callPlaceZome('get_local_snapshots', null);
  }

  async PublishStartingSnapshot(): Promise<SnapshotEntry> {
    return this.callPlaceZome('publish_starting_snapshot', null);
  }

  async getPlacementsAt(bucketIndex: number): Promise<PlacementEntry[]> {
    return this.callPlaceZome('get_placements_at', bucketIndex);
  }

  async getPlacementAuthor(placement: number, bucketIndex: number): Promise<AgentPubKeyB64 | null> {
    return this.callPlaceZome('get_placement_author', {placement, bucketIndex});
  }

  async getAuthorRank(author: AgentPubKeyB64, bucketIndex: number): Promise<number> {
    return this.callPlaceZome('get_author_rank', {author, bucketIndex});
  }


  async placePixel(destructured: DestructuredPlacement): Promise<ActionHashB64> {
    return this.callPlaceZome('place_pixel', destructured);
  }


  /** DEBUG */

  async placePixelAt(input: PlaceAtInput): Promise<ActionHashB64> {
    return this.callPlaceZome('place_pixel_at', input);
  }

  // async publishSnapshotAt(bucket_index: number): Promise<ActionHashB64[]> {
  //   return this.callPlaceZome('publish_snapshot_at', bucket_index);
  // }


  /** Misc */

  // async notify(signal: Signal, folks: Array<AgentPubKeyB64>): Promise<void> {
  //   //if (signal.message.type != "Ping" && signal.message.type != "Pong") {
  //   //  console.debug(`NOTIFY ${signal.message.type}`, signal)
  //   //}
  //   return this.callPlaceZome('notify', {signal, folks});
  // }


  /** */
  private callPlaceZome(fn_name: string, payload: any): Promise<any> {
    console.log("callPlaceZome: " + fn_name + "() ", payload)
    console.info({payload})
    try {
      const result = this.agnosticClient.callZome(this.cellId, "place", fn_name, payload, 10 * 1000);
      //console.log("callZome: " + fn_name + "() result")
      //console.info({result})
      return result;
    } catch (e) {
      console.error("Calling zome " + fn_name + "() failed: ")
      console.error({e})
    }
    return Promise.reject("callZome failed")
  }


  /** -- Conversions -- */
  //
  // locationFromHere(info: HereInfo) : LocationInfo {
  //   let locationMeta:any = {};
  //   try {
  //     for (const [key, value] of Object.entries(info.entry.meta)) {
  //       Object.assign(locationMeta, {[key]: JSON.parse(value, this.reviver)})
  //     }
  //   } catch (e) {
  //     console.error("Failed parsing meta filed into LocationMeta")
  //     console.error(e)
  //   }
  //   //
  //   return {
  //     location: {
  //       coord: JSON.parse(info.entry.value),
  //       sessionEh: info.entry.sessionEh,
  //       meta: locationMeta,
  //     },
  //     linkHh: info.linkHh,
  //     authorPubKey: info.author,
  //   }
  // }
  //
  // hereFromLocation(location: Location) : HereEntry {
  //   let meta: Dictionary<string> = {};
  //   for (const [key, value] of Object.entries(location.meta)) {
  //     meta[key] = JSON.stringify(value, this.replacer)
  //   }
  //   return {
  //     value: JSON.stringify(location.coord),
  //     sessionEh: location.sessionEh,
  //     meta,
  //   }
  // }
  //
  // replacer(key:any, value:any) {
  //   if(value instanceof Map) {
  //     return {
  //       dataType: 'Map',
  //       value: Array.from(value.entries()),
  //     };
  //   } else {
  //     return value;
  //   }
  // }
  //
  // reviver(key:any, value:any) {
  //   if(typeof value === 'object' && value !== null) {
  //     if (value.dataType === 'Map') {
  //       return new Map(value.value);
  //     }
  //   }
  //   return value;
  // }

}
