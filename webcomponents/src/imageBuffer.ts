import * as PIXI from 'pixi.js'
import {SCALE_MODES} from "pixi.js";
import {COLOR_PALETTE} from "./constants";

export function rand(n: number) {
  return Math.round(Math.random() * n)
}


export function randomBuffer(pct:number, worldSize: number): Uint8Array {
  let buff = new Uint8Array(worldSize * worldSize * 4);
  for (let i = 0; i < worldSize * worldSize; i++) {
    buff[i * 4] = Math.floor(255 * pct);  // R
    buff[i * 4 + 1] = Math.floor(255 * pct);  // G
    buff[i * 4 + 2] = Math.floor(255 * pct);  // B
    buff[i * 4 + 3] = 255;  // A
  }
  return buff;
}

export function randomSnapshotData(worldSize: number): Uint8Array {
  let buff = new Uint8Array(worldSize * worldSize / 2);
  for (let i = 0; i < worldSize * worldSize / 2; i += 1) {
    const index = i * 2 % 16
    //buff[i] = index * 16 + ((index + 1) % 16);
    //buff[i] = 5 * 16 + 5;
    buff[i] = 0;
  }
  return buff;
}


export function pos2Index(pos: PIXI.Point, worldSize: number): number {
  return (Math.floor(pos.y) * worldSize + Math.floor(pos.x)) * 4
}

export function setPixel(buffer: Uint8Array, colorHex:number, point: PIXI.Point, worldSize: number) {
  const index = pos2Index(point, worldSize);
  //console.log(`SetPixel(${index}) x: ${point.x} y: ${point.y}  | ${colorHex}`)
  buffer[index] = colorHex / (256 * 256);
  buffer[index+ 1] = colorHex / 256 % 256;
  buffer[index+ 2] = colorHex % 256;
}

export function getPixel(buffer: Uint8Array, point: PIXI.Point, worldSize: number): number {
  const index = pos2Index(point, worldSize);
  const r = buffer[index] * (256 * 256);
  const g = buffer[index + 1] * 256;
  const b = buffer[index + 2] ;
  return r+g+b;
}


export function buffer2Texture(buffer: Uint8Array, worldSize: number): PIXI.Texture {
  return PIXI.Texture.fromBuffer(buffer, worldSize, worldSize, {scaleMode: SCALE_MODES.NEAREST})
}

//export type Pixel = [r: number, g: number, b: number, a: number];

export type DoublePixel = [upper: number, lower: number];


function intoDoublePixel(packed: number): DoublePixel {
  return [Math.floor(packed / 16), packed % 16];
}


/**
 *
 * @param imageData Array of indexed colorIndex 4bpp
 * return Array of rgba
 */
export function snapshotIntoFrame(imageData: Uint8Array, worldSize: number): Uint8Array {
  if(imageData.length != Math.floor(worldSize * worldSize / 2)) {
    console.error(`snapshotIntoFrame(${worldSize}) error: invalid imageData length: ` + imageData.length)
    return new Uint8Array();
  }
  let frame = new Uint8Array(worldSize * worldSize * 4);
  frame.fill(255)
  let i = 0;
  for (const packed of imageData) {
    const doublePixel = intoDoublePixel(packed);
    let color1 = PIXI.utils.string2hex(COLOR_PALETTE[doublePixel[1]]);
    let color2 = PIXI.utils.string2hex(COLOR_PALETTE[doublePixel[0]]);

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

