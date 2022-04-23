import * as PIXI from 'pixi.js'
import {SCALE_MODES} from "pixi.js";
import {COLOR_PALETTE, WORLD_SIZE} from "./constants";
import assert from "assert";


export function rand(n: number) {
  return Math.round(Math.random() * n)
}


export function randomBuffer(pct:number): Uint8Array {
  let buff = new Uint8Array(1000 * 1000 * 4);
  for (let i = 0; i < 1000 * 1000; i++) {
    buff[i * 4] = Math.floor(255 * pct);  // R
    buff[i * 4 + 1] = Math.floor(255 * pct);  // G
    buff[i * 4 + 2] = Math.floor(255 * pct);  // B
    buff[i * 4 + 3] = 255;  // A
  }
  return buff;
}

export function randomSnapshotData(): Uint8Array {
  let buff = new Uint8Array(1000 * 1000 / 2);
  for (let i = 0; i < 1000 * 1000 / 2; i += 1) {
    const index = i * 2 % 16
    buff[i] = index * 16 + ((index + 1) % 16);
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



//export type Pixel = [r: number, g: number, b: number, a: number];

export type DoublePixel = [upper: number, lower: number];


function intoDoublePixel(packed: number): DoublePixel {
  return [Math.floor(packed / 16), packed % 16];
}


/**
 *
 * @param imageData Array of indexed color 4bpp
 * return Array of rgba
 */
export function snapshotIntoFrame(imageData: Uint8Array): Uint8Array {
  assert(imageData.length == WORLD_SIZE * WORLD_SIZE / 2)
  let frame = new Uint8Array(WORLD_SIZE * WORLD_SIZE * 4);
  frame.fill(255)
  let i = 0;
  for (const packed of imageData) {
    const doublePixel = intoDoublePixel(packed);
    let color1 = PIXI.utils.string2hex(COLOR_PALETTE[doublePixel[0]]);
    let color2 = PIXI.utils.string2hex(COLOR_PALETTE[doublePixel[1]]);

    frame[i * 8] = color1 / (256 * 256); // R
    frame[i * 8 + 1] = color1 / 256 % 256;  // G
    frame[i * 8 + 2] = color1 % 256; // B

    frame[i * 8 + 4] = color2 / (256 * 256); // R
    frame[i * 8 + 5] = color2 / 256 % 256; // G
    frame[i * 8 + 6] = color2 % 256; // B
    i += 1;
  }
  return frame;
}

