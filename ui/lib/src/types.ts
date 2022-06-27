// TODO: add globally available interfaces for your elements

import {AgentPubKeyB64, HeaderHashB64, EntryHashB64, HoloHashB64} from "@holochain-open-dev/core-types";
import { createContext, Context } from "@holochain-open-dev/context";
import { PlaceStore } from "./place.store";

export const placeContext : Context<PlaceStore> = createContext('place/service');

export type Dictionary<T> = { [key: string]: T };


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

export interface HoloHashed<T> {
  hash: HoloHashB64;
  content: T;
}

export interface PlaceProperties {
  startTime: number,
  canvasSize: number,
  bucketSizeSec: number,
  pixelsPerBucket: number
  snapshotIntervalInBuckets: number,
}

export interface DestructuredPlacement {
  x: number,
  y: number,
  colorIndex: number,
}


export interface PlaceAtInput {
  placement: DestructuredPlacement,
  bucket_index: number,
}

export interface PlacementAuthorInput {
  placement: number,
  bucket_index: number,
}

export interface PlacementDetails {
  placement: DestructuredPlacement,
  author: AgentPubKeyB64,
}

export interface PlacementEntry {
  pixel: number,
}


export interface PublishCallback {
  (snapshot: SnapshotEntry, cbData?: any): void;
}

export interface SnapshotEntry {
  imageData: Uint8Array,
  timeBucketIndex: number,
}

export function snapshot_to_str(snapshot: SnapshotEntry): string {
  let count = 0;
  snapshot.imageData.forEach((doublePixel) => {
    if (doublePixel > 0) {
      count += 1;
    }
  })
  return "Snapshot " + snapshot.timeBucketIndex + " pixels: " + count;
}


//export type DoublePixel = [upper: number, lower: number];




export function destructurePlacement(placement: PlacementEntry): DestructuredPlacement {
  let id: number = placement.pixel >> 4;
  return {
    x: id >> 16,
    y: id % (1 << 16),
    colorIndex: placement.pixel % 16
  };
}


export function packPlacement(destructured: DestructuredPlacement): PlacementEntry {
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

