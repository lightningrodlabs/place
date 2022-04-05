


export interface SnapshotEntry {
    image_data: number[],
    time_bucket_index: number,
}


export type DoublePixel = [upper: number, lower: number];


function intoDoublePixel(packed: number): DoublePixel {
    return [packed / 16, packed % 16];
}

function snapshotIntoFrame(snapshot: SnapshotEntry): Uint8ClampedArray {
    let frame = new Uint8ClampedArray(1000*1000*4);
    let i = 0;
    for (const packed of snapshot.image_data) {
        const doublePixel = intoDoublePixel(packed);
        let pixel = colorIndex(doublePixel[0]);
        frame.set(pixel, i);
        i += 4;
        pixel = colorIndex(doublePixel[1]);
        frame.set(pixel, i);
        i += 4;
    }
    return frame;
}


export type Pixel = [r: number, g: number, b: number, a: number];

function colorIndex(index: number) {
    switch(index) {
        case  0: return [  0,   0,   0, 255]; break;
        case  1: return [255, 255, 255, 255]; break;
        case  2: return [ 50,  50,  50, 255]; break;
        case  3: return [125, 125, 125, 255]; break;
        case  4: return [200, 200, 200, 255]; break;
        case  5: return [255,  50,  50, 255]; break;
        case  6: return [ 50, 255, 255, 255]; break;
        case  7: return [255,  50,  50, 255]; break;
        case  8: return [ 50, 255,  50, 255]; break;
        case  9: return [ 50, 125,  50, 255]; break;
        case 10: return [125,  50,  50, 255]; break;
        case 11: return [ 50,  50, 125, 255]; break;
        case 12: return [ 90,  40, 120, 255]; break;
        case 13: return [200, 100,  50, 255]; break;
        case 14: return [ 50, 100, 200, 255]; break;
        case 15: return [100, 200, 100, 255]; break;
        default: return [0,0,0,255];
    }
}