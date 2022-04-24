import {css, html, LitElement} from "lit";
import {state} from "lit/decorators.js";

import * as PIXI from 'pixi.js'
import {SCALE_MODES} from 'pixi.js'
import {Viewport} from 'pixi-viewport'

import {contextProvided} from "@holochain-open-dev/context";
import {StoreSubscriber} from "lit-svelte-stores";

import {sharedStyles} from "../sharedStyles";
import {placeContext} from "../types";
import {PlaceStore} from "../place.store";
import {SlBadge, SlTooltip} from '@scoped-elements/shoelace';
import {ScopedElementsMixin} from "@open-wc/scoped-elements";
import {EntryHashB64} from "@holochain-open-dev/core-types";
import {WORLD_SIZE, IMAGE_SCALE, COLOR_PALETTE, color2index} from "../constants";
import {
  buffer2Texture,
  getPixel,
  rand,
  randomBuffer,
  randomSnapshotData,
  setPixel,
  snapshotIntoFrame
} from "../imageBuffer";
import tinycolor from "tinycolor2";

export const delay = (ms:number) => new Promise(r => setTimeout(r, ms))

let g_selectedColor = COLOR_PALETTE[0];
let viewport: any = undefined;
let grid: any = undefined;
let frameSprite: any = undefined;
let startTime: number = Date.now();

let wait = false;
let waiting = false;
let pixiApp:any = undefined;

/**
 * @element place-controller
 */
export class PlaceController extends ScopedElementsMixin(LitElement) {
  constructor() {
    super();
  }

  /** Dependencies */

  @contextProvided({ context: placeContext })
  _store!: PlaceStore;

  _snapshots = new StoreSubscriber(this, () => this._store?.snapshots);

  /** Private properties */

  @state() _currentSnapshotEh: null | EntryHashB64 = null;

  private _initialized: boolean = false;
  private _initializing: boolean = false;
  private _canPostInit: boolean = false;


  get playfieldElem() : HTMLCanvasElement {
    return this.shadowRoot!.getElementById("playfield") as HTMLCanvasElement;
  }

  private async publishLatest() {
    console.log("Calling publishLatest()...")
    let res = await this._store.publishLatestSnapshot();
    console.log("Calling publishLatest() result length: " + res.length)
  }

  /** Launch init when myProfile has been set */
  private subscribeSnapshots() {
    this._store.snapshots.subscribe(async (snapshots) => {
      if (!this._currentSnapshotEh) {
        /** Select first play */
        const [latestEh, latestSnapshot] = this._store.getLatestSnapshot();
        if (latestEh != '') {
          this._currentSnapshotEh = latestEh
          console.log("starting Snapshot: " + latestSnapshot.timeBucketIndex + " | " + latestEh);
        } else {
          console.warn("No starting Snapshot found");

        }
      }
      await this.init();
    });
  }

  /** After first render only */
  async firstUpdated() {
    console.log("place-controller first updated!")
    this.subscribeSnapshots();
  }

  /** After each render */
  async updated(changedProperties: any) {
    if (this._canPostInit) {
      await this.postInit();
    }
  }


  /**
   * Called once a profile has been set
   */
  private async init() {
    this._initializing = true
    console.log("place-controller.init() - START");
    /** Get latest public entries from DHT */
    await this._store.pullDht();
    const snapshots = this._snapshots.value;
    console.log({snapshots})
    /** Done */
    this._initialized = true
    this._initializing = false
    this._canPostInit = true;

    //initPixiApp(this.playfieldElem)

    this.requestUpdate();
    console.log("place-controller.init() - DONE");
  }

  private async postInit() {
    this._canPostInit = false;
    const properties = await this._store.getProperties();
    startTime = Date.now();
    setInterval(async () => await this.publishLatest(), properties.bucketSizeSec * 1000)

    this.initPixiApp(this.playfieldElem)
  }

  takeScreenshot() {
    wait = true;
    pixiApp.renderer.extract.canvas(frameSprite).toBlob((b:any) => {
      const a = document.createElement('a');
      document.body.append(a);
      a.download = 'screenshot';
      a.href = URL.createObjectURL(b);
      a.click();
      a.remove();
    }, 'image/png');
  }


  initPixiApp(canvas: HTMLCanvasElement) {
    console.log(canvas.id + ": " + canvas.offsetWidth + "x" + canvas.offsetHeight)
    /** Setup PIXI app */
    pixiApp = new PIXI.Application({
      //antialias: true,
      view: canvas,
      backgroundColor: 0x111111,
      width: canvas.offsetWidth,
      height: canvas.offsetHeight,
      resolution: devicePixelRatio
    })
    pixiApp.view.style.textAlign = 'center'
    //container.appendChild(pixiApp.view)


    /** Setup viewport */

    viewport = new Viewport({
      passiveWheel: false,                // whether the 'wheel' event is set to passive (note: if false, e.preventDefault() will be called when wheel is used over the viewport)
      //screenWidth: canvas.offsetWidth,              // screen width used by viewport (eg, size of canvas)
      //screenHeight: canvas.offsetHeight            // screen height used by viewport (eg, size of canvas)
    })

    // TODO: remove this workaround (otherwise we get an error on undefined object)
    viewport.trackedPointers = []

    viewport
      .moveCenter(WORLD_SIZE / 2, WORLD_SIZE / 2)
      .drag()
      //.pinch()
      .decelerate()
      .wheel({})

    viewport.interactive = true;
    viewport.interactiveChildren = true;

    //viewport.bounce({})

    // viewport.clamp({direction: 'all'})

    viewport.clampZoom({
      minWidth: canvas.offsetWidth / 50,
      minHeight: canvas.offsetHeight / 50,
      maxWidth: WORLD_SIZE * 20,
      maxHeight: WORLD_SIZE * 20,
    })

    /** DRAW STUFF */

      //Borders
      // const border = viewport.addChild(new PIXI.Graphics())
      // border
      //   .lineStyle(1, 0xff0000)
      //   .drawRect(0, 0, WORLD_SIZE, WORLD_SIZE)

    let buffer: Uint8Array;
    if (this._currentSnapshotEh != null) {
      const snapshots = this._snapshots.value;
      const snapshot = snapshots[this._currentSnapshotEh];
      buffer = snapshotIntoFrame(snapshot.imageData);
    } else {
      //let buffer = randomBuffer(1);
      let buf = randomSnapshotData();
      buffer = snapshotIntoFrame(buf);
    }

    let texture = buffer2Texture(buffer);
    frameSprite = PIXI.Sprite.from(texture);
    frameSprite.scale.x = IMAGE_SCALE
    frameSprite.scale.y = IMAGE_SCALE
    frameSprite.interactive = true;

    frameSprite.on('pointerdown', (e:any) => {
      //console.log({e})
      let customPos;
      let custom = new PIXI.Point(e.data.global.x, e.data.global.y)
      //custom.x -= canvas.offsetLeft
      custom.y -= canvas.offsetTop
      customPos = e.data.getLocalPosition(frameSprite, customPos, custom)
      logText.text = ""
        + "global:" + e.data.global
        + "\n" + "custom:" + customPos
        + "\n" + canvas.offsetLeft + " ; " + canvas.offsetTop

      // Store placement
      this._store.placePixel({
        x: Math.floor(customPos.x),
        y: Math.floor(customPos.y),
        color: color2index(g_selectedColor),
      })

      sel.x = Math.floor(customPos.x) * IMAGE_SCALE
      sel.y = Math.floor(customPos.y) * IMAGE_SCALE
      const tiny = new tinycolor(g_selectedColor)
      const colorNum = parseInt(tiny.toHex(), 16);
      setPixel(buffer, colorNum, customPos);
      let newText = PIXI.Texture.fromBuffer(buffer, WORLD_SIZE, WORLD_SIZE, {scaleMode: SCALE_MODES.NEAREST})
      frameSprite.texture = newText
    })

    // Quadrillage pixel
    grid = new PIXI.Graphics()
    grid.lineStyle(1, 0x333333)
    for (let i = 0; i < WORLD_SIZE * IMAGE_SCALE; i += IMAGE_SCALE) {
      grid
        .moveTo(0, i)
        .lineTo(WORLD_SIZE * IMAGE_SCALE, i)
    }
    for (let i = 0; i < WORLD_SIZE * IMAGE_SCALE; i += IMAGE_SCALE) {
      grid
        .moveTo(i, 0)
        .lineTo(i, WORLD_SIZE * IMAGE_SCALE)
    }
    grid.visible = false;

    let logText = new PIXI.Text(
      `logtext`, {
        fontSize: 16,
      },
    );

    let sel = new PIXI.Graphics();
    sel.lineStyle(1, 0xFF0000)
      .drawRect(0,0, IMAGE_SCALE, IMAGE_SCALE)

    /** Add all elements to stage */

    pixiApp.stage.addChild(viewport)
    viewport.addChild(frameSprite)
    viewport.addChild(grid)
    viewport.addChild(sel)
    //viewport.addChild(logText)

    viewport.on("zoomed", (e:any) => {
      console.log("zoomed event fired: " + viewport.scale.x)
      //console.log({e})
      grid.visible = viewport.scale.x > 2;
      this.requestUpdate()
    })
    viewport.fitWorld(true)

    /** DEBUG ; without viewport **/

    //pixiApp.stage.addChild(img)
    ////pixiApp.stage.addChild(grid)
    //pixiApp.stage.addChild(sel)
    //pixiApp.stage.addChild(logText)
  }


  /**
   *
   */
  async pingOthers() {
    if (this._currentSnapshotEh) {
      // console.log("Pinging All")
      //await this._store.pingOthers(this._currentSnapshotEh, this._profiles.myAgentPubKey)
    }
  }


  async onRefresh() {
    console.log("refresh: Pulling data from DHT")
    await this._store.pullDht()
    await this.pingOthers()
    this.requestUpdate();
  }


  async handleColorChange(e: any) {
    console.log("handleColorChange: " + e.target.lastValueEmitted)
    const color = e.target.lastValueEmitted;
  }

  private async handleSpaceClick(event: any) {
    await this.pingOthers();
  }


  /**
   *
   */
  render() {
    console.log("place-controller render() - " + this._currentSnapshotEh);
    if (!this._initialized) {
      return html`
        <span>Loading...</span>
      `;
    }

    /** Build palette button list */
    //let palette = html``
    let palette = COLOR_PALETTE.map((color)=> {
      const extraClass = g_selectedColor == color? "selected" : "colorButton"
      return html`<button class=" ${extraClass}" style="background-color: ${color}"
                          @click=${() => {g_selectedColor = color; this.requestUpdate()}}></button>`
    })

    //console.log({viewport})
    let sinceLastPublish = Date.now() - startTime;
    sinceLastPublish = Math.round((sinceLastPublish / 1000) % 60)


    return html`
      <div style="display: flex;flex-direction: row">
        <div style="width:80px;display: flex;flex-direction: column">
          ${palette}
          <br/>
          <div>Zoom:</div>
          <div>${Math.round(viewport?.scale.x * 100)}%</div>
          <button style="margin:5px;" @click=${() => {viewport?.fitWorld(true); this.requestUpdate()}}>Fit</button>
          <div>Time:</div>
          <div>${sinceLastPublish} sec</div>
          <button style="margin:5px;" @click=${() => {this.takeScreenshot()}}>Save</button>
        </div>
        <canvas id="playfield" class="appCanvas"></canvas>
      </div>
    `;
  }

  static get scopedElements() {
    return {
      //"place-snapshot": PlaceSnapshot,
      'sl-tooltip': SlTooltip,
      'sl-badge': SlBadge,
    };
  }

  static get styles() {
    return [
      sharedStyles,
      css`
        .appCanvas {
          /*position: relative;*/
          cursor: inherit;
          width: 100%;
          height: 100%;
          min-height: 400px;
          margin-top: 0px;
          margin-bottom: 0px;
          /*display:block;*/
        }

        .selected {
          /*border: 3px dotted blue;*/
          border-radius: 15px;
          border-style: outset;
          border-width: 4px;
          border-color: coral;
          min-height: 30px;
          max-width:  50px;
          margin-top:  5px;
          margin-left:15px;
        }

        .colorButton {
          min-height: 30px;
          max-width:  50px;
          margin-top:  5px;
          margin-left:15px;
          border-radius: 15px;
          border: 3px solid gray;
        }

        @media (min-width: 640px) {
          main {
            max-width: none;
          }
        }
      `,
    ];
  }
}
