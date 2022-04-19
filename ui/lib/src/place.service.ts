import {BaseClient, CellClient} from '@holochain-open-dev/cell-client';
import { serializeHash, EntryHashB64, HeaderHashB64, AgentPubKeyB64 } from '@holochain-open-dev/core-types';

import {
  PlacementEntry,
  SnapshotEntry,
  HoloHashed,
  Signal,
  Dictionary, DestructuredPlacement,
} from './types';
import {CellId} from "@holochain/client/lib/types/common";


export class PlaceService {
  constructor(
    public hcClient: BaseClient,
    protected roleId: string,
  ) {
    let maybe_cell = hcClient.cellDataByRoleId(roleId);
    if (!maybe_cell) {
      throw new Error("Cell not found for role: " + roleId);
    }
    this.cellClient = hcClient.forCell(maybe_cell)
  }

  /** Fields */

  cellClient: CellClient


  /** Methods */

  get myAgentPubKey() : AgentPubKeyB64 {
    return serializeHash(this.cellClient.cellId[1]);
  }


  /** Space */

  async publishLatestSnapshot(): Promise<HeaderHashB64[]> {
    return this.callPlaceZome('publish_latest_snapshot', null);
  }

  async getSnapshot(time: number): Promise<SnapshotEntry> {
    return this.callPlaceZome('get_snapshot', time);
  }

  async getLatestSnapshot(): Promise<SnapshotEntry> {
    return this.callPlaceZome('get_latest_snapshot', null);
  }

  async getPlacementsAt(bucketIndex: number): Promise<PlacementEntry[]> {
    return this.callPlaceZome('get_placements_at', bucketIndex);
  }

  async placePixel(destructured: DestructuredPlacement): Promise<HeaderHashB64> {
    return this.callPlaceZome('place_pixel', destructured);
  }


  /** Misc */

  // async notify(signal: Signal, folks: Array<AgentPubKeyB64>): Promise<void> {
  //   //if (signal.message.type != "Ping" && signal.message.type != "Pong") {
  //   //  console.debug(`NOTIFY ${signal.message.type}`, signal)
  //   //}
  //   return this.callPlaceZome('notify', {signal, folks});
  // }


  private callPlaceZome(fn_name: string, payload: any): Promise<any> {
    //console.debug("callZome: " + fn_name)
    //console.debug({payload})
    const result = this.cellClient.callZome("place", fn_name, payload);
    //console.debug("callZome: " + fn_name + "() result")
    //console.debug({result})
    return result;
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
