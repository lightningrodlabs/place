import {css, html, LitElement} from "lit";
import {property, state} from "lit/decorators.js";

import * as PIXI from 'pixi.js'
//import {SCALE_MODES} from 'pixi.js'
import {Viewport} from 'pixi-viewport'

import {contextProvided} from "@holochain-open-dev/context";
import {StoreSubscriber} from "lit-svelte-stores";

import {sharedStyles} from "../sharedStyles";
import {destructurePlacement, placeContext, snapshot_to_str, SnapshotEntry} from "../types";
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

let g_selectedColor: string | null = null;
let g_viewport: any = undefined;
let g_grid: any = undefined;
let g_frameSprite: any = undefined;
let g_cursor: any = undefined;

let g_lastRefreshMs: number = Date.now();
let g_localSnapshots: any = [];


let pixiApp: any = undefined;
let pixelCount: number = 0;

/**
 * @element place-controller
 */
export class PlaceController extends ScopedElementsMixin(LitElement) {
  constructor() {
    super();
  }

  /** Public attributes */
  @property({ type: Boolean, attribute: 'debug' })
  debugMode: boolean = false;

  /** Dependencies */

  @contextProvided({ context: placeContext })
  _store!: PlaceStore;

  //_snapshots = new StoreSubscriber(this, () => this._store?.snapshots);
  //_placements = new StoreSubscriber(this, () => this._store?.placements);


  /** Private properties */

  //_latestStoredBucketIndex: number = 0;
  _displayedIndex: number = 0;

  private _initialized: boolean = false;
  private _initializing: boolean = false;
  private _canPostInit: boolean = false;
  private _postInitDone: boolean = false;
  private _firstNormalRender: boolean = true;


  get playfieldElem() : HTMLCanvasElement {
    return this.shadowRoot!.getElementById("playfield") as HTMLCanvasElement;
  }


  /** Launch init when myProfile has been set */
  private async subscribeSnapshots() {
    //this._store.snapshots.subscribe(async (snapshots) => {
      if (!this._initialized && !this._initializing) {
        await this.init();
      }
    //});
  }


  /** After first render only */
  async firstUpdated() {
    console.log("place-controller first updated!")
    await this.subscribeSnapshots();
  }

  /** After each render */
  async updated(changedProperties: any) {
    if (this._canPostInit) {
      this.postInit();
    }
    /* Init canvas for normal render */
    if (this._postInitDone) {
      if (this._firstNormalRender) {
        this.initPixiApp(this.playfieldElem)
        this._firstNormalRender = false;
      }
    }
  }


  /** Called once subscribed to stores */
  private async init() {
    this._initializing = true
    console.log("place-controller.init() - START!");

    /** Get latest snapshot from DHT and store it */
    await this._store.pullDht();
    console.log("Latest in store: " + snapshot_to_str(this._store.getLatestStoredSnapshot()!))

    /** Store all local snapshots */
    g_localSnapshots = await this._store.getLocalSnapshots();
    //console.log({g_localSnapshots})

    /** Done */
    this._initialized = true
    this._initializing = false
    this._canPostInit = true;

    //initPixiApp(this.playfieldElem)

    this.requestUpdate();
    console.log("place-controller.init() - DONE");
  }


  /** Called once after first update after init is done */
  private async postInit() {
    console.log("place-controller.postInit() - START!");
    this._canPostInit = false;
    console.log({properties: await this._store.getProperties()})

    this.initPixiApp(this.playfieldElem)

    const maybeLatestStored = this._store.getLatestStoredSnapshot()
    console.log({maybeLatestStored})
    if (maybeLatestStored) {
      this.setFrame(maybeLatestStored);
      /** Check if we need to sync */
      const nowIndex = this._store.epochToBucketIndex(Date.now() / 1000)
      if (maybeLatestStored.timeBucketIndex < nowIndex) {
        await this.syncToNow(nowIndex);
      }

      ///** Update page every second */
      //setInterval(() => {this.requestUpdate()}, 2000);

      // TODO: should be offloaded to a different thread?
      await this.startRealTimePublishing();
    }
    //await this.viewFuture()
    this._postInitDone = true;
    console.log("place-controller.postInit() - DONE");
    this.requestUpdate()
  }


  /** Callback for this.syncToNow() */
  private onPublish(snapshot: SnapshotEntry, cbData?: any): void {
    console.log("onPublish() called: " + snapshot.timeBucketIndex)
    cbData.setFrame(snapshot)
    cbData.requestUpdate()
  }

  /** */
  private async syncToNow(nowIndex?: number) {
    const nowIndex2 = nowIndex? nowIndex: this._store.epochToBucketIndex(Date.now() / 1000)
    let nowSnapshot = await this._store.getSnapshotAt(nowIndex2);
    if (!nowSnapshot) {
      await this._store.publishUpTo(nowIndex2, this.onPublish, this);
    }
  }

  /** */
  private async publishNowSnapshot() {
    const nowIndex = this._store.epochToBucketIndex(Date.now() / 1000)
    let nowSnapshot = await this._store.getSnapshotAt(nowIndex);
    console.log(`publishNowSnapshot() now = ${nowIndex} ; exists = ` + nowSnapshot != null);
    if (nowSnapshot) {
      console.log("publishNowSnapshot() aborted. Already exists | " + nowIndex)
      return;
    }
    const res = await this._store.publishNextSnapshotAt(nowIndex - 1)
    console.log("publishNowSnapshot() " + nowIndex + ": " + (res? "SUCCEEDED" : "FAILED"));
    await this.refresh()
    if (res) {
      await this.viewFuture()
    }
  }


  /** */
  private async startRealTimePublishing() {
    await this.publishNowSnapshot()
    /** Init auto-publish loop */
    if (!this.debugMode) {
      const properties = await this._store.getProperties();
      /* Wait for next bucket start to launch loop */
      const startSec = Math.ceil(Date.now() / 1000);
      const startIndexPlus = Math.ceil(startSec / properties.bucketSizeSec)
      const waitForSec = startIndexPlus * properties.bucketSizeSec - startSec
      console.log("Auto-publish loop starting in " + waitForSec + " secs")
      setTimeout(() => {
          setInterval(async () => {
              g_lastRefreshMs = Date.now();
              console.log("auto calling publishNowSnapshot() - " + g_lastRefreshMs)
              await this.publishNowSnapshot();
            },
            properties.bucketSizeSec * 1000
          );
        },
        waitForSec * 1000
      )
    }
  }


  /** */
  takeScreenshot() {
    pixiApp.renderer.extract.canvas(g_viewport).toBlob((b:any) => {
      const a = document.createElement('a');
      document.body.append(a);
      a.download = 'screenshot';
      a.href = URL.createObjectURL(b);
      a.click();
      a.remove();
    }, 'image/png');
  }


  /** Set frame to now snapshot */
  async viewFuture() {
    console.log("viewFuture()...")
    /* pixi must be initiazed */
    if (!g_frameSprite) {
      this.requestUpdate();
      return;
    }
    /* Reload latest */
    let latest = this._store.getLatestStoredSnapshot();
    /* Latest must correspond to 'now' */
    const nowIndex = this._store.epochToBucketIndex(Date.now() / 1000)
    if (!latest || latest.timeBucketIndex != nowIndex) {
      this.syncToNow();
      return;
      //await this._store.publishUpTo(nowIndex);
    }
    latest = this._store.getLatestStoredSnapshot();
    if (!latest || latest.timeBucketIndex != nowIndex) {
      console.error("Latest snapshot should be 'now'");
      return;
    }
    const placements = await this._store.getPlacementsAt(latest.timeBucketIndex);
    this.setFrame(latest);
    /* Update frame with current bucket placements */
    let buffer = snapshotIntoFrame(latest.imageData);
    for (const placement of placements) {
      let destructed = destructurePlacement(placement)
      const tiny = new tinycolor(COLOR_PALETTE[destructed.colorIndex])
      const colorNum = parseInt(tiny.toHex(), 16);
      const pos = new PIXI.Point(destructed.x, destructed.y)
      setPixel(buffer, colorNum, pos);
    }
    this._displayedIndex = latest.timeBucketIndex + 1
    /** Apply new texture */
    g_frameSprite.texture = buffer2Texture(buffer)
    this.requestUpdate()
  }


  /** */
  setFrame(snapshot: SnapshotEntry) {
    this._displayedIndex = snapshot.timeBucketIndex
    console.log("frame set to: " + snapshot_to_str(snapshot));
    const buffer = snapshotIntoFrame(snapshot.imageData);
    if (g_frameSprite) g_frameSprite.texture = buffer2Texture(buffer);
  }


  /** */
  initPixiApp(canvas: HTMLCanvasElement) {
    console.log("Pixi canvas '" + canvas.id + "': " + canvas.offsetWidth + "x" + canvas.offsetHeight)
    /** Setup PIXI app */
    pixiApp = new PIXI.Application({
      //antialias: true,
      view: canvas,
      backgroundColor: 0x111111,
      width: canvas.offsetWidth,
      height: canvas.offsetHeight,
      preserveDrawingBuffer: true,
      //resolution: devicePixelRatio,
      //resizeTo: canvas
    })
    pixiApp.view.style.textAlign = 'center'
    //container.appendChild(pixiApp.view)


    /** Setup viewport */

    g_viewport = new Viewport({
      passiveWheel: false,                // whether the 'wheel' event is set to passive (note: if false, e.preventDefault() will be called when wheel is used over the viewport)
      //screenWidth: canvas.offsetWidth,              // screen width used by viewport (eg, size of canvas)
      //screenHeight: canvas.offsetHeight            // screen height used by viewport (eg, size of canvas)
    })

    // TODO: remove this workaround (otherwise we get an error on undefined object)
    g_viewport.trackedPointers = []

    g_viewport
      .moveCenter(WORLD_SIZE * IMAGE_SCALE / 2, WORLD_SIZE * IMAGE_SCALE / 2)
      .drag({
        //mouseButtons: "middle-right",
      })
      //.pinch()
      .decelerate()
      .wheel({})

    g_viewport.interactive = true;
    g_viewport.interactiveChildren = true;

    //viewport.bounce({})

    // viewport.clamp({direction: 'all'})

    g_viewport.clampZoom({
      minWidth: 50,
      minHeight: 50,
      maxWidth: WORLD_SIZE * 100,
      maxHeight: WORLD_SIZE * 100,
    })

    /** DRAW STUFF */

      //Borders
      // const border = viewport.addChild(new PIXI.Graphics())
      // border
      //   .lineStyle(1, 0xff0000)
      //   .drawRect(0, 0, WORLD_SIZE, WORLD_SIZE)

    let buffer: Uint8Array;
    if (this._store.latestStoredBucketIndex != 0) {
      //const snapshots = this._snapshots.value;
      const snapshot = this._store.snapshotStore[this._store.latestStoredBucketIndex];
      console.log("Starting latest: " + snapshot_to_str(snapshot));
      buffer = snapshotIntoFrame(snapshot.imageData);
    } else {
      //let buffer = randomBuffer(1);
      let buf = randomSnapshotData();
      buffer = snapshotIntoFrame(buf);
    }

    let texture = buffer2Texture(buffer);
    g_frameSprite = PIXI.Sprite.from(texture);
    g_frameSprite.scale.x = IMAGE_SCALE
    g_frameSprite.scale.y = IMAGE_SCALE
    g_frameSprite.interactive = true;

    /** On pixel click (can't declare elsewhere because we need defined variables) */
    g_frameSprite.on('pointerdown', (event:any) => {
      //console.log({event})
      let custom = new PIXI.Point(event.data.global.x, event.data.global.y)
      //custom.x -= this.playfieldElem.offsetLeft
      custom.y -= this.playfieldElem.offsetTop
      let customPos;
      customPos = event.data.getLocalPosition(g_frameSprite, customPos, custom)
      logText.text = ""
        //+ "global:" + event.data.global + "\n"
        + "custom:" + customPos + "\n"
        //+ canvas.offsetLeft + " ; " + canvas.offsetTop

      /** Store placement */
      if (g_selectedColor && this._displayedIndex > this._store.latestStoredBucketIndex) {
        g_cursor.visible = true;
        this._store.placePixelAt({
          placement: {
            x: Math.floor(customPos.x),
            y: Math.floor(customPos.y),
            colorIndex: color2index(g_selectedColor),
          },
          bucket_index: this._store.latestStoredBucketIndex
        })

        g_cursor.x = Math.floor(customPos.x) * IMAGE_SCALE
        g_cursor.y = Math.floor(customPos.y) * IMAGE_SCALE
        const tiny = new tinycolor(g_selectedColor)
        const colorNum = parseInt(tiny.toHex(), 16);
        setPixel(buffer, colorNum, customPos);
        let updatedTexture = buffer2Texture(buffer)
        g_frameSprite.texture = updatedTexture
      }
    })

    /** Quadrillage */
    g_grid = new PIXI.Graphics()
    g_grid.lineStyle(1, 0x444444)
    for (let i = 0; i < WORLD_SIZE * IMAGE_SCALE; i += IMAGE_SCALE) {
      g_grid
        .moveTo(0, i)
        .lineTo(WORLD_SIZE * IMAGE_SCALE, i)
    }
    for (let i = 0; i < WORLD_SIZE * IMAGE_SCALE; i += IMAGE_SCALE) {
      g_grid
        .moveTo(i, 0)
        .lineTo(i, WORLD_SIZE * IMAGE_SCALE)
    }
    g_grid.visible = false;

    let logText = new PIXI.Text(
      `logtext`, {
        fontSize: 16,
      },
    );

    /** pixel cursor */
    g_cursor = new PIXI.Graphics();
    g_cursor.lineStyle(1, 0xFF0000)
      .drawRect(0,0, IMAGE_SCALE, IMAGE_SCALE)
    g_cursor.visible = false;


    /** Add all elements to stage */

    pixiApp.stage.addChild(g_viewport)
    g_viewport.addChild(g_frameSprite)
    g_viewport.addChild(g_grid)
    g_viewport.addChild(g_cursor)
    //g_viewport.addChild(logText)

    g_viewport.on("zoomed", (e:any) => {
      //console.log("zoomed event fired: " + viewport.scale.x)
      //console.log({e})
      g_grid.visible = g_viewport.scale.x > 2;
      this.requestUpdate()
    })
    g_viewport.fitWorld(true)



    /** DEBUG ; without viewport **/

    // pixiApp.stage.addChild(g_frameSprite)
    // //pixiApp.stage.addChild(grid)
    // pixiApp.stage.addChild(g_cursor)
    // pixiApp.stage.addChild(logText)
  }


  /** */
  async refresh() {
    console.log("refresh(): Pulling data from DHT")
    await this._store.pullDht()
    g_localSnapshots = await this._store.getLocalSnapshots();
    const latestStored = this._store.getLatestStoredSnapshot();
    if (!latestStored) {
      return;
    }
    if (latestStored.timeBucketIndex > 0) {
      this.setFrame(latestStored);
    }
    await this.viewFuture()
    //this.requestUpdate();
  }


  async handleColorChange(e: any) {
    console.log("handleColorChange: " + e.target.lastValueEmitted)
    //const color = e.target.lastValueEmitted;
  }


  // private async handleSpaceClick(event: any) {
  //   // n/a
  // }


  /**
   *
   */
  render() {
    console.log("place-controller render() - " + this._store.latestStoredBucketIndex);
    if (!this._initialized) {
      return html`
        <span>Loading...</span>
      `;
    }
    if (!this._postInitDone) {
      return this.renderSyncing()
    }
    return this.renderNormal();
  }


  /** Render to display when syncing to latest frame */
  renderSyncing() {
    console.log("place-controller renderSyncing()");
    let localBirthDate = new Date(this._store.getMaybeProperties()!.startTime * 1000).toLocaleString()
    const nowIndex = this._store.epochToBucketIndex(Date.now() / 1000)

    /** */
    return html`
      <canvas id="playfield" class="appCanvas"></canvas>
      <h2>SYNCING...</h2>
      <div>Birthdate: ${localBirthDate}</div>
      <div>Synced to: ${this._store.getRelativeBucketIndex(this._displayedIndex)} / ${this._store.getRelativeBucketIndex(nowIndex)}</div>
    `;
  }


  /** Normal render for real-time editing of frame */
  renderNormal() {
    console.log("place-controller renderNormal()");

    /** Build Time UI */
    let sinceLastPublishSec = Math.floor((Date.now() - g_lastRefreshMs) / 1000);
    //sinceLastPublish = Math.round((sinceLastPublish / 1000) % 60)
    let timeUi;
    if (this.debugMode) {
      timeUi = html`
        <button class="" style="" @click=${async () => {await this.publishNowSnapshot()}}>Publish</button>
        <br/>
      `
    } else {
      timeUi = html`
        <div>Time:</div>
        <div>${sinceLastPublishSec} sec</div>
      `
    }

    /** Build snapshot button list */
    const stored = Object.values(this._store.snapshotStore);
    console.log({stored})
    let snapshotButtons: any[] = [];
    const startIndex = this._store.getStartIndex()
    const nowIndex = this._store.epochToBucketIndex(Date.now() / 1000)
    let bucketCount = nowIndex - startIndex + 1;
    console.log(`Buttons: bucketCount: ${bucketCount} = ${nowIndex} - ${startIndex}`)
    for(let relBucketIndex = 0; relBucketIndex < bucketCount; relBucketIndex += 1) {
      const maybeSnapshot = this._store.snapshotStore[startIndex + relBucketIndex]
      if (!maybeSnapshot) {
        console.log(`Buttons: no snapshot found at ${relBucketIndex}`)
        continue;
      }
      let details = this._store.placementStore[startIndex + relBucketIndex - 1]
      let label = "" + relBucketIndex
      if (!details) {
        details = [];
      } else {
        label = relBucketIndex + ": " + details.length
      }
      console.log({details})
      const button = html`<button class="" style=""
                        @click=${() => {this.setFrame(maybeSnapshot); this.requestUpdate();}}>${label}</button>`
      snapshotButtons[relBucketIndex] = button
    }
    //console.log("snapshotButtons: " + snapshotButtons.length)

    /** Build placement log list */
    let displayedDetails = this._store.placementStore[this._displayedIndex]
    if (!displayedDetails) {
      displayedDetails = [];
    }
    let placementDetails = displayedDetails.map((detail) => {
      return html`<li>{x: ${detail.placement.x}, y:${detail.placement.y}, color:${detail.placement.colorIndex}} - ${detail.author}</li>`
    })


    /** Build palette button list */
    //let palette = html``
    let palette = COLOR_PALETTE.map((color)=> {
      const extraClass = g_selectedColor == color? "selected" : "colorButton"
      return html`<button class="${extraClass}" style="background-color: ${color}"
                          @click=${() => {g_selectedColor = color; this.requestUpdate()}}></button>`
    })

    let localBirthDate = new Date(this._store.getMaybeProperties()!.startTime * 1000).toLocaleString()
    //localBirthDate.setUTCSeconds(g_startTime);

    /** render all */
    return html`
      <div style="display: flex;flex-direction: row">
        <div style="width:80px;display: flex;flex-direction: column">
          <button class=" ${g_selectedColor? "colorButton" : "selected"} " style=""
                  @click=${() => {g_selectedColor = null; g_cursor.visible = false; this.requestUpdate()}}>None</button>
          ${palette}
          <br/>
          <div>Zoom:</div>
          <div>${Math.round(g_viewport?.scale.x * 100)}%</div>
          <button style="margin:5px;" @click=${() => {
            g_viewport?.fitWorld(false);
            g_viewport?.moveCenter(WORLD_SIZE * IMAGE_SCALE / 2, WORLD_SIZE * IMAGE_SCALE / 2);
            this.requestUpdate();
          }}>Fit</button>
          <button style="margin:5px;" @click=${() => {this.takeScreenshot()}}>Save</button>
          <button style="margin:5px;" @click=${() => {this.refresh()}}>Refresh</button>
          ${timeUi}
          <div> local: ${g_localSnapshots.length}</div>
          <div>stored: ${stored.length}</div>
            <!--<div>Pixels: ${pixelCount}</div>-->
        </div>
        <canvas id="playfield" class="appCanvas"></canvas>
      </div>
      <div>Birthdate: ${localBirthDate}</div>
      <div> Latest: ${this._store.getRelativeBucketIndex(this._store.latestStoredBucketIndex)}</div>
      <div>Viewing: ${this._store.getRelativeBucketIndex(this._displayedIndex)}</div>
      <div>
        ${snapshotButtons}
        <button class="" style="" @click=${async () => {await this.viewFuture()}}>now</button>
      </div>
      <div>
        <span>Placements:</span>
        <ol>${placementDetails}</ol>
      </div>
    `;
  }


  /** */
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
