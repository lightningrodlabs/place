import {css, html, LitElement} from "lit";
import {property, state} from "lit/decorators.js";

import * as PIXI from 'pixi.js'
//import {SCALE_MODES} from 'pixi.js'
import {Viewport} from 'pixi-viewport'

import {contextProvided} from "@holochain-open-dev/context";
import {StoreSubscriber} from "lit-svelte-stores";

import {sharedStyles} from "../sharedStyles";
import {
  destructurePlacement,
  packPlacement,
  placeContext,
  PlacementEntry,
  snapshot_to_str,
  SnapshotEntry
} from "../types";
import {PlaceStore} from "../place.store";
import {SlBadge, SlTooltip} from '@scoped-elements/shoelace';
import {ScopedElementsMixin} from "@open-wc/scoped-elements";
import {EntryHashB64} from "@holochain-open-dev/core-types";
import {IMAGE_SCALE, COLOR_PALETTE, color2index} from "../constants";
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
import {unpack_destructuring} from "svelte/types/compiler/compile/nodes/shared/Context";
import 'lit-flatpickr';

export const delay = (ms:number) => new Promise(r => setTimeout(r, ms))

const toHHMMSS = function (str: string) {
  var sec_num = parseInt(str, 10); // don't forget the second param
  var hours:any   = Math.floor(sec_num / 3600);
  var minutes:any = Math.floor((sec_num - (hours * 3600)) / 60);
  var seconds:any = sec_num - (hours * 3600) - (minutes * 60);

  if (hours   < 10) {hours   = "0"+hours;}
  if (minutes < 10) {minutes = "0"+minutes;}
  if (seconds < 10) {seconds = "0"+seconds;}
  return hours+':'+minutes+':'+seconds;
}

let g_selectedColor: string | null = null;
let g_viewport: any = undefined;
let g_grid: any = undefined;
let g_frameSprite: any = undefined;
let g_cursor: any = undefined;

let g_buffer: Uint8Array = new Uint8Array();

let g_canViewLive = true;

let g_localSnapshotIndexes: any = [];

let g_loopMutex = true; // Crappy mutex

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

  get datePickerElem(): any {
    return this.shadowRoot!.getElementById("my-date-picker");
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
        const properties = await this._store.getProperties()
        this.initPixiApp(this.playfieldElem, properties.canvasSize)
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
    console.log("Calling getLocalSnapshots()...")
    g_localSnapshotIndexes = await this._store.getLocalSnapshots();
    console.log({g_localSnapshotIndexes})

    /** Done */
    this._initialized = true
    this._initializing = false
    this._canPostInit = true;

    this.requestUpdate();
    console.log("place-controller.init() - DONE");
  }


  /** Called once after first update after init is done */
  private async postInit() {
    console.log("place-controller.postInit() - START!");
    this._canPostInit = false;
    const properties = await this._store.getProperties()
    console.log({properties})

    this.initPixiApp(this.playfieldElem, properties.canvasSize)

    let maybeLatestStored = this._store.getLatestStoredSnapshot()
    console.log({maybeLatestStored})
    if (maybeLatestStored) {
      this.setFrame(maybeLatestStored, properties.canvasSize);
      /** Check if we need to sync. Also we may need to sync again after a sync if a sync takes too long */
      let nowIndex = 0
      do {
        nowIndex = this._store.epochToBucketIndex(Date.now() / 1000)
        if (maybeLatestStored!.timeBucketIndex < nowIndex) {
          await this.syncToNow(nowIndex);
        }
        maybeLatestStored = this._store.getLatestStoredSnapshot()
      } while(maybeLatestStored!.timeBucketIndex != nowIndex)

      /** Try update page every second */
      setInterval(async () => {
        if (!g_loopMutex) {
          return;
        }
        console.log("Try publishing snapshot...")
        g_loopMutex = false;
        /* Try publish now */
        if (!this.debugMode) {
          await this.publishNowSnapshot(Date.now() / 1000);
        }
        /* Follow latest live view */
        if(g_canViewLive /*&& this._displayedIndex <= nowIndex*/) {
          await this.viewLive();
        }
        this.requestUpdate()
        g_loopMutex = true;
      }, 1 * 1000);

      // TODO: should be offloaded to a different thread?
      //await this.startRealTimePublishing();
    }
    await this.viewLive()
    this._postInitDone = true;
    console.log("place-controller.postInit() - DONE");
    this.requestUpdate()
  }


  /** Callback for this.syncToNow() */
  private onPublish(snapshot: SnapshotEntry, cbData?: any): void {
    console.log("onPublish() called: " + snapshot.timeBucketIndex)
    cbData.setFrame(snapshot, cbData._store.getMaybeProperties()!.canvasSize)
    cbData.requestUpdate();
  }


  /** Get snapshot from DHT or publish it yourself */
  private async syncToNow(nowIndex?: number) {
    const nowIndex2 = nowIndex? nowIndex: this._store.epochToBucketIndex(Date.now() / 1000)
    let nowSnapshot = await this._store.getSnapshotAt(nowIndex2);
    if (!nowSnapshot) {
      await this._store.publishUpTo(nowIndex2, this.onPublish, this);
    }
  }


  /** */
  private async publishNowSnapshot(nowSec: number) {
    const nowIndex = this._store.epochToBucketIndex(nowSec)
    const nowSnapshot = await this._store.getSnapshotAt(nowIndex);
    //console.log(`publishNowSnapshot() now = ${nowIndex} ; exists = ` + (nowSnapshot != null));
    if (nowSnapshot) {
      let myRank = this._store.myRankStore[nowIndex]
      if (!myRank) {
        await this._store.getMyRenderTime(nowIndex)
        myRank = this._store.getMyRankAt(nowIndex)
      }
      //console.log("publishNowSnapshot() aborted. Already exists | " + this._store.getRelativeBucketIndex(nowIndex) + " | my rank : " + myRank)
      if (g_canViewLive && nowIndex > this._displayedIndex) {
        // await this.refresh()
        await this.viewLive()
      }
      return;
    }
    //const res = await this._store.publishNextSnapshotAt(nowIndex - 1)
    const res = await this._store.publishNextSnapshot(nowSec)
    console.log("publishNowSnapshot() " + nowIndex + ": " + (res? "SUCCEEDED" : "FAILED"));
    if (res && g_canViewLive) {
      // await this.refresh()
      await this.viewLive()
    //   this.requestUpdate()
    }
  }


  /** Set frame to now snapshot + placements in future bucket */
  async viewLive(currentPlacement?: PlacementEntry) {
    //console.log("viewLive()...")
    /* pixi must be initiazed */
    if (!g_frameSprite) {
      this.requestUpdate();
      return;
    }
    g_cursor.visible = false;

    await this.refresh()

    /* Reload latest */
    let latest = this._store.getLatestStoredSnapshot();
    if (!latest) {
      console.warn("viewLive() aborting: no latest snapshot stored")
      return;
    }

    /* Latest must correspond to 'now' */
    const nowIndex = this._store.epochToBucketIndex(Date.now() / 1000)
    // if (latest.timeBucketIndex != nowIndex) {
    //   console.error("viewLive() aborted: Latest snapshot should be 'now'");
    //   return;
    // }
    if (latest.timeBucketIndex != nowIndex) {
      console.log("viewLive() syncToNow ...")
      await this.syncToNow(nowIndex);
      //return;
    }
    latest = this._store.getLatestStoredSnapshot();
    if (!latest || latest.timeBucketIndex != nowIndex) {
      console.error("Latest snapshot should be 'now'");
      return;
    }

    /* Create future frame */
    let placements = await this._store.getPlacementsAt(latest.timeBucketIndex);
    if (currentPlacement) {
      placements.push(currentPlacement)
    }
    //console.log(`viewLive() adding ${placements.length} placements to index ` + latest.timeBucketIndex)
    this.viewUpdatedSnapshot(latest, placements)
  }


  /** */
  async viewUpdatedSnapshot(snapshot: SnapshotEntry, placements: PlacementEntry[]) {
    //console.log(`viewUpdatedSnapshot() adding ${placements.length} placements to index ` + this._store.getRelativeBucketIndex(snapshot.timeBucketIndex))
    /* Update frame with current bucket placements */
    const properties = await this._store.getProperties()
    g_buffer = snapshotIntoFrame(snapshot.imageData, properties.canvasSize);
    for (const placement of placements) {
      let destructed = destructurePlacement(placement)
      const tiny = new tinycolor(COLOR_PALETTE[destructed.colorIndex])
      const colorNum = parseInt(tiny.toHex(), 16);
      const pos = new PIXI.Point(destructed.x, destructed.y)
      setPixel(g_buffer, colorNum, pos, properties.canvasSize);
    }
    this._displayedIndex = snapshot.timeBucketIndex + 1
    /** Apply new texture */
    g_frameSprite.texture = buffer2Texture(g_buffer, properties.canvasSize)
    this.requestUpdate()
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


  /** */
  setFrame(snapshot: SnapshotEntry, worldSize: number) {
    this._displayedIndex = snapshot.timeBucketIndex
    console.log("frame set to: " + this._store.getRelativeBucketIndex(snapshot.timeBucketIndex));
    g_buffer = snapshotIntoFrame(snapshot.imageData, worldSize);
    if (g_frameSprite) g_frameSprite.texture = buffer2Texture(g_buffer, worldSize);
  }


  /** */
  initPixiApp(canvas: HTMLCanvasElement, worldSize: number) {
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
      .moveCenter(worldSize * IMAGE_SCALE / 2, worldSize * IMAGE_SCALE / 2)
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
      maxWidth: worldSize * 100,
      maxHeight: worldSize * 100,
    })

    /** DRAW STUFF */

      //Borders
      // const border = viewport.addChild(new PIXI.Graphics())
      // border
      //   .lineStyle(1, 0xff0000)
      //   .drawRect(0, 0, WORLD_SIZE, WORLD_SIZE)

    //let buffer: Uint8Array;
    if (this._store.latestStoredBucketIndex != 0) {
      //const snapshots = this._snapshots.value;
      const snapshot = this._store.snapshotStore[this._store.latestStoredBucketIndex];
      console.log("Starting latest: " + snapshot_to_str(snapshot));
      g_buffer = snapshotIntoFrame(snapshot.imageData, worldSize);
    } else {
      //let buffer = randomBuffer(1);
      let buf = randomSnapshotData(worldSize);
      g_buffer = snapshotIntoFrame(buf, worldSize);
    }

    let texture = buffer2Texture(g_buffer, worldSize);
    g_frameSprite = PIXI.Sprite.from(texture);
    g_frameSprite.scale.x = IMAGE_SCALE
    g_frameSprite.scale.y = IMAGE_SCALE
    g_frameSprite.interactive = true;

    /** On pixel click (can't declare elsewhere because we need defined variables) */
    g_frameSprite.on('pointerdown', async (event:any) => {
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

      /** get buffer */
      // const latest = this._store.getLatestStoredSnapshot();
      // if (latest) {
      //   buffer = snapshotIntoFrame(latest.imageData);
      // }

      /** Set & store clicked placement */
      if (g_selectedColor && this._displayedIndex > this._store.latestStoredBucketIndex) {
        g_cursor.visible = true;
        const placement = {
            x: Math.floor(customPos.x),
            y: Math.floor(customPos.y),
            colorIndex: color2index(g_selectedColor),
          };

        g_cursor.x = Math.floor(customPos.x) * IMAGE_SCALE
        g_cursor.y = Math.floor(customPos.y) * IMAGE_SCALE

        try {
          // this._store.placePixelAt({
          //   placement,
          //   bucket_index: this._store.latestStoredBucketIndex
          // })
          await this._store.placePixel(placement)
          const tiny = new tinycolor(g_selectedColor)
          const colorNum = parseInt(tiny.toHex(), 16);
          setPixel(g_buffer, colorNum, customPos, worldSize);
          let updatedTexture = buffer2Texture(g_buffer, worldSize)
          g_frameSprite.texture = updatedTexture
        } catch(e) {
          console.error("Failed to place pixel: ", e)
          alert("Pixel already placed for this time unit")
        }
        // await this.viewLive(packPlacement(placement))
      }
    })

    /** Quadrillage */
    g_grid = new PIXI.Graphics()
    g_grid.lineStyle(1, 0x444444)
    for (let i = 0; i < worldSize * IMAGE_SCALE; i += IMAGE_SCALE) {
      g_grid
        .moveTo(0, i)
        .lineTo(worldSize * IMAGE_SCALE, i)
    }
    for (let i = 0; i < worldSize * IMAGE_SCALE; i += IMAGE_SCALE) {
      g_grid
        .moveTo(i, 0)
        .lineTo(i, worldSize * IMAGE_SCALE)
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
    //console.log("refresh(): Pulling data from DHT")
    await this._store.pullDht()
    g_localSnapshotIndexes = await this._store.getLocalSnapshots();
    // const latestStored = this._store.getLatestStoredSnapshot();
    // if (!latestStored) {
    //   return;
    // }
    // const properties =  await this._store.getProperties();
    // if (latestStored.timeBucketIndex > 0) {
    //   this.setFrame(latestStored, properties.canvasSize);
    // }
    // if(g_canViewLive) {
    //   await this.viewLive()
    // }
    this.requestUpdate();
  }


  async handleColorChange(e: any) {
    console.log("handleColorChange: " + e.target.lastValueEmitted)
    //const color = e.target.lastValueEmitted;
  }


  // private async handleSpaceClick(event: any) {
  //   // n/a
  // }


  async onDatePicked(date:Date) {
    console.log("onDatePicked called: ", date)
    const bucketIndex = this._store.epochToBucketIndex(date.getTime() / 1000)
    console.log("onDatePicked bucketIndex: ", this._store.getRelativeBucketIndex(bucketIndex), bucketIndex)
    await this.viewSnapshotAt(bucketIndex)
  }


  async viewSnapshotAt(iBucketIndex: number) {
    g_cursor.visible = false;
    g_canViewLive = false;
    const placements = await this._store.getPlacementsAt(iBucketIndex)
    const maybeSnapshot = await this._store.getSnapshotAt(iBucketIndex)
    if (maybeSnapshot) {
      this.setFrame(maybeSnapshot, this._store.getMaybeProperties()!.canvasSize);
      this.requestUpdate();
    } else {
      /* Try constructing from previous snapshot */
      const maybePreviousSnapshot = await this._store.getSnapshotAt(iBucketIndex - 1)
      if (maybePreviousSnapshot) {
        await this.viewUpdatedSnapshot(maybePreviousSnapshot, placements)
      } else {
        alert("No snapshot found at this timeframe")
      }
    }
  }


  buildSnapshotButtons(nowIndex: number): any[] {
    const startIndex = this._store.getStartIndex()
    const bucketCount = nowIndex - startIndex + 1
    console.log(`Buttons: timeframeCount: ${bucketCount} = ${nowIndex} - ${startIndex} + 1`)
    let snapshotButtons: any[] = []
    for (let relBucketIndex = 0; relBucketIndex < bucketCount; relBucketIndex += 1) {
      const iBucketIndex = startIndex + relBucketIndex
      //const maybeSnapshot = this._store.snapshotStore[iBucketIndex]
      // if (!maybeSnapshot) {
      //   //console.log(`Buttons: no snapshot found at ${relBucketIndex}`)
      //   continue;
      // }
      //const disabled = maybeSnapshot? null : "disabled";
      let label = "" + relBucketIndex
      const button = html`
          <button class="" style="" @click=${() => {this.viewSnapshotAt(iBucketIndex)}}>
            ${label}
          </button>`
      snapshotButtons[relBucketIndex] = button
    }
    //console.log("snapshotButtons: " + snapshotButtons.length)
    return snapshotButtons
  }


  /** */
  render() {
    //console.log("place-controller render() - " + this._store.latestStoredBucketIndex);
    if (!this._initialized) {
      return html`
        <span>Loading...</span>
      `;
    }
    if (!this._postInitDone) {
      return this.renderPublishToNow()
    }
    return this.renderNormal();
  }


  /** Render to do when syncing to latest frame */
  renderPublishToNow() {
    console.log("place-controller renderPublishToNow()");
    let localBirthDate = new Date(this._store.getMaybeProperties()!.startTime * 1000).toLocaleString()
    const nowIndex = this._store.epochToBucketIndex(Date.now() / 1000)

    /** */
    return html`
      <canvas id="playfield" class="appCanvas"></canvas>
      <h2>Publishing snapshots up to current time... ${this._store.getRelativeBucketIndex(this._displayedIndex)} / ${this._store.getRelativeBucketIndex(nowIndex)}</h2>
      <div>Birthdate: ${localBirthDate}</div>
    `;
  }


  /** Normal render for real-time editing of frame */
  renderNormal() {
    //console.log("place-controller renderNormal()");
    /** Frame consts */
    const maybeProperties = this._store.getMaybeProperties()
    const nowMs: number = Date.now()
    const nowSec = Math.floor(nowMs / 1000)
    const nowIndex = this._store.epochToBucketIndex(nowSec)
    const nowDate = new Date(nowIndex * maybeProperties!.bucketSizeSec * 1000)
    const startDate = new Date(maybeProperties!.startTime * 1000)
    const localBirthDate = startDate.toLocaleString()
    //console.log({nowDate})
    const timeDiff = nowSec - maybeProperties!.startTime
    const stored = Object.values(this._store.snapshotStore);
    //console.log({stored})

    /** Build Time UI */
    let timeUi;
    if (this.debugMode) {
      timeUi = html`
        <button class="" style="" @click=${async () => {await this.publishNowSnapshot(Date.now() / 1000)}}>Publish</button>
        <br/>
      `
    } else {
      //sinceLastPublish = Math.round((sinceLastPublish / 1000) % 60)
      const nextIn = (nowIndex + 1) * maybeProperties!.bucketSizeSec - nowSec
      timeUi = html`
        <div>Next in:</div>
        <div>${nextIn} secs</div>
      `
    }

    /** Build snapshot button list */
    //let snapshotButtons: any[] = [] //this.buildSnapshotButtons(nowIndex)

    /** Build TimeTravel UI */
    let timeTravelUi =
      html`
        <lit-flatpickr id="my-date-picker" enableTime dateFormat="Y-m-d H:i" theme="dark"
                       placeHolder="Select Date..."
                       minuteIncrement=${Math.floor(maybeProperties!.bucketSizeSec / 60)}
                       .minDate=${startDate} .maxDate=${nowDate}
                       .onOpen="${() => {console.log("my-date-picker onOpen!") ; g_loopMutex = false;}}"
                       .onClose="${() => {console.log("my-date-picker onClose!") ; g_loopMutex = true;}}"
                       .onChange=${(dates:any) => {this.onDatePicked(dates[0])}}
        ></lit-flatpickr>`
      //html`<input id="dateInput" type="text" placeholder="Select Date..." readonly="readonly">`


    /** Build placement logs */
    let displayedDetails = this._store.placementStore[this._displayedIndex]
    if (!displayedDetails) {
      this._store.getPlacementsAt(this._displayedIndex).then(() => this.requestUpdate())
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

    const myRank = this._store.getMyRankAt(this._displayedIndex);
    const publishers = this._store.getPublishersAt(this._displayedIndex);


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
            g_viewport?.moveCenter(maybeProperties!.canvasSize * IMAGE_SCALE / 2, maybeProperties!.canvasSize * IMAGE_SCALE / 2);
            this.requestUpdate();
          }}>Fit</button>
          <button style="margin:5px;" @click=${() => {this.takeScreenshot()}}>Save</button>
          <button style="margin:5px;" @click=${async() => {
            await this.refresh()
            if(g_canViewLive) {
              await this.viewLive()
            }
            }}>Refresh</button>
          ${timeUi}
            <!--<div> latest local: ${g_localSnapshotIndexes.length > 0 ? g_localSnapshotIndexes[0] : 0}</div>>-->
           <!--<div>stored: ${stored.length}</div>>-->
            <!--<div>Pixels: ${pixelCount}</div>-->
        </div>
        <canvas id="playfield" class="appCanvas"></canvas>
      </div>
      <div>Birthdate: ${localBirthDate}</div>
      <!--<div>Age: ${toHHMMSS(timeDiff.toString())}</div>-->
      <div id="timeTravelDiv">
        <div>View:</div>
          <!--<div>Latest stored: ${this._store.getRelativeBucketIndex(this._store.latestStoredBucketIndex)}</div>-->
        ${timeTravelUi}
        <button class="" style="" @click=${async () => {g_canViewLive = true; this.datePickerElem.clear(); await this.viewLive()}}>Live</button>
      </div>
      <div>Displaying bucket: ${this._store.getRelativeBucketIndex(this._displayedIndex)} ${g_canViewLive? " (live)" :""}</div>
      <div id="displayedIndexInfoDiv" style="min-height: 200px; margin-left: 20px;">
        <!--<div>Now: ${this._store.getRelativeBucketIndex(nowIndex)}</div>-->
        <div> - My render rank: ${myRank}</div>
        <div> - Publishers: ${publishers}</div>
        <span> - Placements:</span>
        <ol>${placementDetails}</ol>
        <br/>
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
