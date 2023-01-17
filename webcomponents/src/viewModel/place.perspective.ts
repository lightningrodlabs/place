// TODO: add globally available interfaces for your elements

import {Snapshot, Placement, DestructuredPlacement} from "../bindings/place.types";
import {Dictionary} from "@ddd-qc/cell-proxy";
import {AgentPubKeyB64, EntryHashB64} from "@holochain/client";



export interface PlacePerspective {
  /** TimeBucketIndex -> Snapshot */
  snapshots: Dictionary<Snapshot>,
  /** TimeBucketIndex -> Placement */
  placements: Dictionary<PlacementDetails[]>,

  myRanks: Dictionary<number>,
  publishers: Dictionary<AgentPubKeyB64[]>,
}


export function defaultPerspective(): PlacePerspective {
  return {
    snapshots: {},
    placements: {},
    myRanks: {},
    publishers: {},
  }
}


export enum PlaceState {
  Uninitialized,
  Initializing,
  Initialized,
  //PostInitialized,
  Live,
  Publishing,
  Retrospection,
  Loading,
}

// export interface HoloHashed<T> {
//   hash: HoloHashB64;
//   content: T;
// }



export interface PlacementDetails {
  placement: DestructuredPlacement,
  author: AgentPubKeyB64,
}

export interface PublishCallback {
  (snapshot: Snapshot, cbData?: any): void;
}


/** */
export function snapshot_to_str(snapshot: Snapshot): string {
  let count = 0;
  snapshot.imageData.forEach((doublePixel) => {
    if (doublePixel > 0) {
      count += 1;
    }
  })
  return "Snapshot " + snapshot.timeBucketIndex + " pixels: " + count;
}


/** */
export function destructurePlacement(placement: Placement): DestructuredPlacement {
  let id: number = placement.pixel >> 4;
  return {
    x: id >> 16,
    y: id % (1 << 16),
    colorIndex: placement.pixel % 16
  };
}


export function packPlacement(destructured: DestructuredPlacement): Placement {
  let pixel = destructured.colorIndex
  + destructured.x << 20
      + destructured.y << 4;
  return {
    pixel
  };
}


export type Signal =
  | {
    maybeSpaceHash: EntryHashB64 | null, from: AgentPubKeyB64, message: { type: "Ping", content: AgentPubKeyB64 }
  }
  | {
  maybeSpaceHash: EntryHashB64 | null, from: AgentPubKeyB64, message: { type: "Pong", content: AgentPubKeyB64 }
}
  | {
  maybeSpaceHash: EntryHashB64 | null, from: AgentPubKeyB64, message: {type: "NewSnapshot", content: EntryHashB64}
}

