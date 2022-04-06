// TODO: add globally available interfaces for your elements

import {AgentPubKeyB64, HeaderHashB64, EntryHashB64, HoloHashB64} from "@holochain-open-dev/core-types";
import { createContext, Context } from "@holochain-open-dev/context";
import { PlaceStore } from "./place.store";

export const placeContext : Context<PlaceStore> = createContext('place/service');

export type Dictionary<T> = { [key: string]: T };

export interface HoloHashed<T> {
  hash: HoloHashB64;
  content: T;
}


export interface DestructuredPlacement {
  x: number,
  y: number,
  color: number,
}


export interface PlacementEntry {
  pixel: number,
}


export interface SnapshotEntry {
  imageData: number[],
  timeBucketIndex: number,
}


export type DoublePixel = [upper: number, lower: number];




function destructurePlacement(placement: PlacementEntry): DestructuredPlacement {
  let id: number = placement.pixel / 16;
  return {
    x: id >> 20,
    y: id % 1 << 16,
    color: placement.pixel % 16
  };
}


function packPlacement(destructured: DestructuredPlacement): PlacementEntry {
  let pixel = destructured.color
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
  maybeSpaceHash: EntryHashB64 | null, from: AgentPubKeyB64, message: {type: "NewHere", content:  HereInfo}
  }
  | {
  maybeSpaceHash: EntryHashB64 | null, from: AgentPubKeyB64, message: {type: "DeleteHere", content: [EntryHashB64, HeaderHashB64]}
  }
  | {
  maybeSpaceHash: EntryHashB64 | null, from: AgentPubKeyB64, message: {type: "NewSpace", content: EntryHashB64}
}

