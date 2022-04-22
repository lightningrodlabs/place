import * as PIXI from 'pixi.js'
import {SCALE_MODES} from "pixi.js";
import {WORLD_SIZE} from "./constants";

export function rand(n: number) {
  return Math.round(Math.random() * n)
}

export function randomBuffer(pct:number): Uint8Array {
  let buff = new Uint8Array(1000 * 1000 * 4);
  for (let i = 0; i < 1000 * 1000; i++) {
    buff[i * 4] = Math.floor(255 * pct);  // R
    buff[i * 4 + 1] = 0;  // G
    buff[i * 4 + 2] = 0;  // B
    buff[i * 4 + 3] = 255;  // A
  }
  return buff;
}


export function pos2Index(pos: PIXI.Point): number {
  return (Math.floor(pos.y) * WORLD_SIZE + Math.floor(pos.x)) * 4
}

export function setPixel(buffer: Uint8Array, colorHex:number, point: PIXI.Point) {
  const index = pos2Index(point);
  buffer[index] = colorHex / (256 * 256);
  buffer[index+ 1] = colorHex / 256 % 256;
  buffer[index+ 2] = colorHex % 256;
}

export function getPixel(buffer: Uint8Array, point: PIXI.Point): number {
  const index = pos2Index(point);
  const r = buffer[index] * (256 * 256);
  const g = buffer[index + 1] * 256;
  const b = buffer[index + 2] ;
  return r+g+b;
}


export function buffer2Texture(buffer:Uint8Array): PIXI.Texture {
  return PIXI.Texture.fromBuffer(buffer, WORLD_SIZE, WORLD_SIZE, {scaleMode: SCALE_MODES.NEAREST})
}
