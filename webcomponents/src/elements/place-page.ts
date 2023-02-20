import {css, html} from "lit";
import {property} from "lit/decorators.js";

import * as PIXI from 'pixi.js'
//import {SCALE_MODES} from 'pixi.js'
import {Viewport} from 'pixi-viewport'

import tinycolor from "tinycolor2";
import 'lit-flatpickr';

import {sharedStyles} from "../sharedStyles";

import {color2index, COLOR_PALETTE, IMAGE_SCALE} from "../constants";
import {buffer2Texture, randomSnapshotData, setPixel, snapshotIntoFrame} from "../imageBuffer";
import {delay, ZomeElement} from "@ddd-qc/lit-happ";
import {destructurePlacement, PlacePerspective, PlaceState, snapshot_to_str} from "../viewModel/place.perspective";
import {PlaceZvm} from "../viewModel/place.zvm";
import {Placement, PlaceProperties, Snapshot} from "../bindings/place.types";
import {toHHMMSS} from "../time";


/**
 * @element place-page
 */
export class PlacePage extends ZomeElement<PlacePerspective, PlaceZvm> {
  constructor() {
    super(PlaceZvm.DEFAULT_ZOME_NAME)
  }

  /** Public attributes */
  @property({ type: Boolean, attribute: 'debug' })
  debugMode: boolean = false;


  /** PIXI Elements */
  _pixiApp: any = undefined;
  _grid: any = undefined;
  _viewport?: Viewport;
  _frameSprite: any = undefined;
  _cursor: any = undefined;
  _frameBuffer: Uint8Array = new Uint8Array();

  /** Private properties */
  _state: PlaceState = PlaceState.Uninitialized;
  _transitioning = false;
  _canAutoRefresh = true;
  _displayedIndex: number = 0;
  _selectedColor: string | null = null;
  _hideOverlay = false;

  _canFullscreen: boolean = true;
  _canMouseDown: boolean = true;
  _mustInitPixi: boolean = true;

  _requestingSnapshotIndex: number | null = null; // 0 = Live, otherwise the actual snapshot index

  _pixelsPlaced: number = 0;
  _loopCount: number = 0;

  /** used for stopping setInterval on exit */
  _interval: NodeJS.Timer;


  /** Getters */

  get playfieldElem(): HTMLCanvasElement | null {
    const maybePlayfield = this.shadowRoot!.getElementById("playfield");
    if (!maybePlayfield) {
      return null;
    }
    return maybePlayfield as HTMLCanvasElement;
  }

  get datePickerElem(): any {
    return this.shadowRoot!.getElementById("my-date-picker");
  }

  get loadingOverlayElem(): HTMLDivElement {
    return this.shadowRoot!.getElementById("loading-overlay") as HTMLDivElement;
  }


  /** After first render only */
  async firstUpdated() {
    console.log("place-page first update done!")
    await this.init();
  }


  /** After each render */
  async updated(changedProperties: any) {
    //console.log("   <place-page>.updated()")

    if (this._mustInitPixi) {
      const properties = await this._zvm.getProperties()
      console.log({properties})
      this.initPixiApp(this.playfieldElem, properties.canvasSize)
      this._mustInitPixi = false;
    }

    switch(this._state) {
      case PlaceState.Initialized: {
        await this.postInit();
        break;
      }
      case PlaceState.Publishing:
      case PlaceState.Live: {
        break;
      }
      case PlaceState.Loading: {
        /** Figure out if we must transition to Publishing, Live or Retrospection */

        /** Retrospection if requestingSnapshotIndex has been set */
        if (this._requestingSnapshotIndex && this._requestingSnapshotIndex != 0) {
          await this.changeState(PlaceState.Retrospection);
          break;
        }

        /** Publishing if latest snapshot is older than now */
        let maybeLatestStored = this._zvm.getLatestStoredSnapshot()
        //console.log({maybeLatestStored})
        if (!maybeLatestStored) {
          break;
        }
        let nowIndex = this._zvm.epochToBucketIndex(Date.now() / 1000);
        nowIndex -=  nowIndex % this._zvm.getMaybeProperties()!.snapshotIntervalInBuckets;
        if (maybeLatestStored!.timeBucketIndex < nowIndex) {
          await this.changeState(PlaceState.Publishing);
          break;
        }
        /** Live otherwise */
        const succeeded = await this.changeState(PlaceState.Live)
        /** If Live failed, fallback to Publishing */
        if (!succeeded) {
          await this.changeState(PlaceState.Publishing);
        }
        break;
      }
      default: break;
    }
  }


  /**
   * Called after first update
   * Get local snapshots and latest from DHT
   */
  private async init() {
    console.log("<place-page>.init() - START!");
    await this.changeState(PlaceState.Initializing)

    /** Wait a second for pixi to startup? */
    await delay(1 * 1000);

    /** Get the latest snapshot from DHT and store it */
    await this._zvm.pullLatestSnapshotFromDht();
    console.log("Latest in store: " + snapshot_to_str(this._zvm.getLatestStoredSnapshot()!))

    /** Store all local snapshots */
    console.log("Calling getLocalSnapshots()...")
    try {
      const localSnapshots = await this._zvm.getLocalSnapshots();
      console.log("localSnapshots.length = ", localSnapshots.length)
    } catch (e) {
      console.log("Calling getLocalSnapshots() failed")
    }

    /** Done */
    await this.changeState(PlaceState.Initialized);
    console.log("<place-page>.init() - DONE");
  }



  /** */
  initPixiApp(canvas: HTMLCanvasElement | null, worldSize: number) {
    if (!canvas) return;
    console.log("Pixi canvas '" + canvas.id + "': " + canvas.offsetWidth + "x" + canvas.offsetHeight)
    /** Setup PIXI app */
    this._pixiApp = new PIXI.Application({
      //antialias: true,
      view: canvas,
      backgroundColor: 0x111111,
      width: canvas.offsetWidth,
      height: canvas.offsetHeight,
      preserveDrawingBuffer: true,
      //resolution: window.devicePixelRatio,
      resizeTo: canvas
    })
    this._pixiApp.view.style.textAlign = 'center'
    //container.appendChild(g_pixiApp.view)

    this._pixiApp.renderer.plugins.interaction.cursorStyles.default = "grab";
    this._pixiApp.renderer.plugins.interaction.cursorStyles.copy = "copy";
    this._pixiApp.renderer.plugins.interaction.cursorStyles.grab = "grab";

    //this._pixiApp.renderer.plugins.interaction.moveWhenInside = true;

    /** Setup viewport */

    this._viewport = new Viewport({
      passiveWheel: false,                // whether the 'wheel' event is set to passive (note: if false, e.preventDefault() will be called when wheel is used over the viewport)
      //screenWidth: canvas.offsetWidth,              // screen width used by viewport (eg, size of canvas)
      //screenHeight: canvas.offsetHeight            // screen height used by viewport (eg, size of canvas)
    })
    // TODO: remove this workaround (otherwise we get an error on undefined object)
    //this._viewport.trackedPointers = []
    this._viewport
      .moveCenter(worldSize * IMAGE_SCALE / 2, worldSize * IMAGE_SCALE / 2)
      .drag({
        //mouseButtons: "middle-right",
      })
      //.pinch()
      .decelerate()
      .wheel({})
    this._viewport.interactive = true;
    this._viewport.interactiveChildren = true;
    //viewport.bounce({})
    // viewport.clamp({direction: 'all'})
    this._viewport.clampZoom({
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
    if (this._zvm.latestStoredBucketIndex != 0) {
      //const snapshots = this._snapshots.value;
      const snapshot = this._zvm.perspective.snapshots[this._zvm.latestStoredBucketIndex];
      console.log("Starting latest: " + snapshot_to_str(snapshot));
      this._frameBuffer = snapshotIntoFrame(snapshot.imageData, worldSize);
    } else {
      console.log("Starting random image");
      //let buffer = randomBuffer(1);
      let buf = randomSnapshotData(worldSize);
      this._frameBuffer = snapshotIntoFrame(buf, worldSize);
    }

    let texture = buffer2Texture(this._frameBuffer, worldSize);
    this._frameSprite = PIXI.Sprite.from(texture);
    this._frameSprite.scale.x = IMAGE_SCALE
    this._frameSprite.scale.y = IMAGE_SCALE
    this._frameSprite.interactive = true;

    /** On pixel click (can't declare elsewhere because we need defined variables) */
    this._frameSprite.on('mousedown', async (event:any) => {
      //console.log(" !! mouse event !! ", event.type)
      if (event && event.type != "mousedown" || !this._canMouseDown) {
        //console.warn("Not a mouse down event")
        return;
      }
      this._canMouseDown = false;

      let custom = new PIXI.Point(event.data.global.x, event.data.global.y)
      //custom.x -= this.playfieldElem.offsetLeft
      custom.y -= this.playfieldElem!.offsetTop
      let customPos;
      customPos = event.data.getLocalPosition(this._frameSprite, customPos, custom)
      logText.text = ""
        //+ "global:" + event.data.global + "\n"
        + "custom:" + customPos + "\n"
      //+ canvas.offsetLeft + " ; " + canvas.offsetTop


      /** Set & store clicked placement */
      if (this._selectedColor && this._state == PlaceState.Live) {
        const placement = {
          x: Math.floor(customPos.x),
          y: Math.floor(customPos.y),
          colorIndex: color2index(this._selectedColor),
        };

        this._cursor.x = Math.floor(customPos.x) * IMAGE_SCALE
        this._cursor.y = Math.floor(customPos.y) * IMAGE_SCALE

        try {
          this._pixelsPlaced += 1
          await this._zvm.placePixel(placement)
          const tiny = new tinycolor(this._selectedColor)
          const colorNum = parseInt(tiny.toHex(), 16);
          setPixel(this._frameBuffer, colorNum, customPos, worldSize);
          let updatedTexture = buffer2Texture(this._frameBuffer, worldSize)
          this._frameSprite.texture = updatedTexture
          this._cursor.visible = true;
        } catch(e) {
          this._pixelsPlaced -= 1
          console.error("Failed to place pixel: ", e)
          this.disableCursor()
          alert("Max pixels already placed for this time unit")
        }
      }
      if (this._selectedColor && this._state == PlaceState.Retrospection) {
        this.disableCursor()
        alert("Pixel can't be placed when viewing older canvas")
      }
      this._canMouseDown = true;
    })

    /** Quadrillage */
    this._grid = new PIXI.Graphics()
    this._grid.lineStyle(1, 0x444444)
    for (let i = 0; i < worldSize * IMAGE_SCALE; i += IMAGE_SCALE) {
      this._grid
        .moveTo(0, i)
        .lineTo(worldSize * IMAGE_SCALE, i)
    }
    for (let i = 0; i < worldSize * IMAGE_SCALE; i += IMAGE_SCALE) {
      this._grid
        .moveTo(i, 0)
        .lineTo(i, worldSize * IMAGE_SCALE)
    }
    this._grid.visible = false;

    let logText = new PIXI.Text(
      `logtext`, {
        fontSize: 16,
      },
    );

    /** pixel cursor */
    this._cursor = new PIXI.Graphics();
    this._cursor.lineStyle(1, 0xFF0000)
      .drawRect(0,0, IMAGE_SCALE, IMAGE_SCALE)
    this._cursor.visible = false;


    /** Add all elements to stage */
    this._pixiApp.stage.addChild(this._viewport)
    this._viewport.addChild(this._frameSprite)
    this._viewport.addChild(this._grid)
    this._viewport.addChild(this._cursor)
    //g_viewport.addChild(logText)

    this._viewport.on("zoomed", (e:any) => {
      console.log("zoomed event fired:", this._viewport, this._grid);
      //console.log({e})
      if (this._viewport && this._grid) {
        this._grid.visible = this._viewport.scale.x > 2;
        this.requestUpdate()
      }
    })
    this.fitCanvas(this._zvm.getMaybeProperties()!)

    /** DEBUG ; without viewport **/
    //this._pixiApp.stage.addChild(this._frameSprite)
    //this._pixiApp.stage.addChild(this._grid)
    //this._pixiApp.stage.addChild(this._cursor)
    //this._pixiApp.stage.addChild(logText)
  }


  /** Called once after init is done and canvas has been rendered */
  private async postInit() {
    console.log("<place-page>.postInit() - START!");
    const properties = await this._zvm.getProperties()
    console.log({properties})

    this.initPixiApp(this.playfieldElem, properties.canvasSize)

    /** Display latest stored snapshot */
    let maybeLatestStored = this._zvm.getLatestStoredSnapshot()
    //console.log({maybeLatestStored})
    if (maybeLatestStored) {
      this.viewSnapshot(maybeLatestStored, properties.canvasSize);
    }

    /** Start refresh loop and try to publish snapshot every x seconds */
    this._interval = setInterval(async () => {
      this._loopCount += 1
      if (!this._canAutoRefresh) {
        return;
      }
      this._canAutoRefresh = false;
      if (this._loopCount % 15 == 0 && !this.debugMode && this._state != PlaceState.Publishing) {
        console.log("Try publishing snapshot...")
        try {
          await this.publishNowSnapshot(Date.now() / 1000);
        } catch(e) {
          console.error("publishNowSnapshot() failed", e)
        }
      }
      this.requestUpdate()
      this._canAutoRefresh = true;
    }, 1 * 1000);

    /** Transition to Live */
    this._requestingSnapshotIndex = 0
    const succeeded = await this.changeState(PlaceState.Loading);
    console.log("<place-page>.postInit() - DONE");
  }


  /** Get now snapshot from DHT or publish it yourself */
  private async publishToNow(nowIndex?: number) {
    const nowIndex2 = nowIndex? nowIndex: this._zvm.epochToBucketIndex(Date.now() / 1000)
    let nowSnapshot = await this._zvm.getSnapshotAt(nowIndex2);
    if (!nowSnapshot) {
      //await this._store.publishUpTo(nowIndex2, this.onPublish, this);
      await this._zvm.publishSameUpTo(nowIndex2, this.onPublish, this);
    }
  }


  /** Callback for this.publishToNow() */
  private onPublish(snapshot: Snapshot, cbData?: PlacePage): void {
    console.log("onPublish() called: " + snapshot.timeBucketIndex)
    if (cbData) {
      cbData.viewSnapshot(snapshot, cbData._zvm.getMaybeProperties()!.canvasSize)
      cbData.requestUpdate();
    }
  }


  /** */
  private async publishNowSnapshot(nowSec: number) {
    const nowIndex = this._zvm.epochToBucketIndex(nowSec)
    const nowSnapshot = await this._zvm.getSnapshotAt(nowIndex);
    //console.log(`publishNowSnapshot() now = ${nowIndex} ; exists = ` + (nowSnapshot != null));
    /** Now snapshot found ; just get my rank */
    if (nowSnapshot) {
      let myRank = this._zvm.perspective.myRanks[nowIndex]
      if (!myRank) {
        await this._zvm.getMyRenderTime(nowIndex)
        myRank = this._zvm.getMyRankAt(nowIndex)
      }
      /** When in Live make sure we are displaying latest */
      //console.log("publishNowSnapshot() aborted. Already exists | " + this._store.getRelativeBucketIndex(nowIndex) + " | my rank : " + myRank)
      if (this._state == PlaceState.Live && nowIndex > this._displayedIndex) {
        // await this.refresh()
        await this.transitionToLive()
      }
      return;
    }
    /** Not found: try to publish */
    //const res = await this._store.publishNextSnapshotAt(nowIndex - 1)
    const res = await this._zvm.publishNextSnapshot(nowSec)
    console.log("publishNowSnapshot() " + nowIndex + ": " + (res? "SUCCEEDED" : "FAILED"));
    /** When in Live make sure we are displaying latest */
    if (res && this._state == PlaceState.Live) {
      // await this.refresh()
      await this.transitionToLive()
    //   this.requestUpdate()
    }
  }

  /** */
  takeScreenshot() {
    this._pixiApp.renderer.extract.canvas(this._viewport).toBlob((b:any) => {
      const a = document.createElement('a');
      document.body.append(a);
      a.download = 'screenshot';
      a.href = URL.createObjectURL(b);
      a.click();
      a.remove();
    }, 'image/png');
  }


  /** */
  async viewFutureSnapshot(snapshot: Snapshot, placements: Placement[]) {
    //console.log(`viewFutureSnapshot() adding ${placements.length} placements to index ` + this._store.getRelativeBucketIndex(snapshot.timeBucketIndex))
    /* Update frame with current bucket placements */
    const properties = await this._zvm.getProperties()
    console.log({properties})
    this._frameBuffer = snapshotIntoFrame(snapshot.imageData, properties.canvasSize);
    for (const placement of placements) {
      let destructed = destructurePlacement(placement)
      const tiny = new tinycolor(COLOR_PALETTE[destructed.colorIndex])
      const colorNum = parseInt(tiny.toHex(), 16);
      const pos = new PIXI.Point(destructed.x, destructed.y)
      setPixel(this._frameBuffer, colorNum, pos, properties.canvasSize);
    }
    this._displayedIndex = snapshot.timeBucketIndex + 1
    /** Apply new texture */
    this._frameSprite.texture = buffer2Texture(this._frameBuffer, properties.canvasSize)
    this.requestUpdate()
  }


  /** */
  viewSnapshot(snapshot: Snapshot, worldSize: number) {
    this._displayedIndex = snapshot.timeBucketIndex
    console.log("frame set to: " + this._zvm.getRelativeBucketIndex(snapshot.timeBucketIndex));
    this._frameBuffer = snapshotIntoFrame(snapshot.imageData, worldSize);
    if (this._frameSprite) {
      this._frameSprite.texture = buffer2Texture(this._frameBuffer, worldSize);
    }
  }


  /** */
  async viewSnapshotAt(iBucketIndex: number): Promise<boolean> {
    console.log("called viewSnapshotAt()", iBucketIndex)
    this._hideOverlay = false;
    this._cursor.visible = false;
    //const placements = await this._store.getPlacementsAt(iBucketIndex)
    const maybeSnapshot = await this._zvm.getSnapshotAt(iBucketIndex)
    if (maybeSnapshot) {
      this.viewSnapshot(maybeSnapshot, this._zvm.getMaybeProperties()!.canvasSize);
      this.requestUpdate();
    }
    this._hideOverlay = true;
    return false;
  }


  /** */
  changeCursorMode(cursorMode: String) {
    this._pixiApp.renderer.plugins.interaction.cursorStyles.default = cursorMode
    this._pixiApp.renderer.plugins.interaction.setCursorMode(cursorMode)
  }


  /** */
  async refresh() {
    //console.log("refresh(): Pulling data from DHT")
    await this._zvm.pullLatestSnapshotFromDht()
    if(this._state == PlaceState.Live) {
       await this.transitionToLive()
     }
    this.requestUpdate();
  }


  async handleColorChange(e: any) {
    console.log("handleColorChange: " + e.target.lastValueEmitted)
    //const color = e.target.lastValueEmitted;
  }


  // private async handleSpaceClick(event: any) {
  //   // n/a
  // }


  /** */
  async onDatePicked(date:Date) {
    //console.log("onDatePicked called: ", date)
    const bucketIndex = this._zvm.epochToBucketIndex(date.getTime() / 1000)
    console.log("onDatePicked bucketIndex: ", this._zvm.getRelativeBucketIndex(bucketIndex), bucketIndex)
    this._requestingSnapshotIndex = bucketIndex
  }


  /** */
  buildSnapshotButtons(nowIndex: number): any[] {
    const startIndex = this._zvm.getStartIndex()
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
          <button class="" style="" @click=${async () => { await this.viewSnapshotAt(iBucketIndex)}}>
            ${label}
          </button>`
      snapshotButtons[relBucketIndex] = button
    }
    //console.log("snapshotButtons: " + snapshotButtons.length)
    return snapshotButtons
  }


  /** */
  async changeState(newState: PlaceState): Promise<boolean> {
    if (this._transitioning) {
      console.warn("Called transition during a transition", this._state, newState);
      return false;
    }
    this._transitioning = true;
    const succeeded = await this.transition(newState);
    this._transitioning = false;
    if (succeeded) {
      this.requestUpdate();
    }
    return succeeded;
  }


  /** Return true on success */
  async transition(newState: PlaceState): Promise<boolean> {
    console.log("Transitioning:", this._state, newState)
    switch(this._state) {
      case PlaceState.Uninitialized: {
        if (newState != PlaceState.Initializing) {
          console.error("Invalid state transition request Uninitialized", this._state, newState);
          return false;
        }
        break;
      }
      case PlaceState.Initializing: {
        if (newState != PlaceState.Initialized) {
          console.error("Invalid state transition request Initializing", this._state, newState);
          return false;
        }
        break;
      }
      case PlaceState.Initialized: {
        if (newState == PlaceState.Loading) {
          this.transitionToLoading()
        } else {
          console.error("Invalid state transition request Initialized", this._state, newState);
          return false;
        }
        break;
      }
      case PlaceState.Loading: {
        console.log("Transitioning from Loading to:", newState)
        switch(newState) {
          case PlaceState.Publishing: {
            this.publishToNow().then(_ => this.changeState(PlaceState.Loading));
            break;
          }
          case PlaceState.Retrospection: {
            await this.transitionToRetrospection();
            break;
          }
          case PlaceState.Live: {
            const succeeded = await this.transitionToLive();
            if (!succeeded) {
              return false;
            }
            break;
          }
          default: {
            console.error("Invalid state transition request Loading", this._state, newState);
            return false;
          }
        }
        break;
      }
      case PlaceState.Live:
      case PlaceState.Retrospection:
      case PlaceState.Publishing: {
        if (newState == PlaceState.Loading) {
          this.transitionToLoading()
        } else {
          console.error("Invalid state transition request", this._state, newState);
          return false;
        }
        break;
      }
      default: break;
    }
    /* Store new state value */
    console.log("Transitioned to:", newState)
    this._state = newState;
    return true;
  }


  /** Set frame to now snapshot + placements in future bucket */
  async transitionToLive(currentPlacement?: Placement): Promise<boolean> {
    //console.log("transitionToLive()...")

    this._cursor.visible = false;

    await this._zvm.pullLatestSnapshotFromDht()

    /* Latest must correspond to 'now' */
    let latest = this._zvm.getLatestStoredSnapshot();
    if (!latest) {
      console.warn("transitionToLive() aborting: no latest snapshot stored")
      return false;
    }
    const nowIndex = this._zvm.epochToBucketIndex(Date.now() / 1000)
    const nowSnapshotIndex = nowIndex - (nowIndex % this._zvm.getMaybeProperties()!.snapshotIntervalInBuckets);
    console.log("transitionToLive()", nowIndex, nowSnapshotIndex)
    if (latest.timeBucketIndex != nowSnapshotIndex) {
      console.warn("transitionToLive() latest.timeBucketIndex != nowSnapshotIndex", latest.timeBucketIndex, nowSnapshotIndex)
      return false;
    }

    /* Create future frame */
    let placements: Placement[] = [];
    for(let i = nowSnapshotIndex; i <= nowIndex; i++) {
      const current: Placement[] = await this._zvm.getPlacementsAt(i);
      placements = placements.concat(current)
    }
    if (currentPlacement) {
      placements.push(currentPlacement)
    }
    //console.log(`transitionToLive() adding ${placements.length} placements to index ` + latest.timeBucketIndex)
    await this.viewFutureSnapshot(latest, placements)
    this._hideOverlay = true;
    return true;
  }


  /** */
  transitionToLoading() {
    this._hideOverlay = false;
    this.disableCursor();
    this._mustInitPixi = true;
  }


  /** */
  async transitionToRetrospection() {
    //this.disableCursor();
    const succeeded = await this.viewSnapshotAt(this._requestingSnapshotIndex!)
    console.log("transitionToRetrospection() success = ", succeeded)
    this._requestingSnapshotIndex = null;
    //this.loadingOverlayElem.hidden = true;
    this._hideOverlay = true;
  }


  /** */
  disableCursor() {
    this._selectedColor = null;
    this._cursor.visible = false;
    this.changeCursorMode("grab")
  }


  /** Render the current state */
  render() {
    //console.log("<place-page> render() - " + this._state);
    switch(this._state) {
      case PlaceState.Uninitialized:
      case PlaceState.Initializing: return this.renderStartup();
      case PlaceState.Initialized:
      case PlaceState.Publishing: return this.renderPublishToNow();
      case PlaceState.Live: return this.renderNormal();
      case PlaceState.Retrospection: return this.renderNormal();
      case PlaceState.Loading: return this.renderNormal();
      default: break;
    }
    return this.renderNormal();
  }


  /** */
  renderStartup() {
    return html`
        <span>Loading...</span>
        <!--<span>${this._state}</span>-->
        <!--<canvas id="playfield" class="appCanvas"></canvas>-->
      `;
  }


  /** Render to do when syncing to the latest frame */
  renderPublishToNow() {
    let localBirthDate = new Date(this._zvm.getMaybeProperties()!.startTime * 1000).toLocaleString()
    const nowIndex = this._zvm.epochToBucketIndex(Date.now() / 1000)
    /** */
    return html`
      <h2>Publishing snapshots up to current time... ${Math.max(0, this._zvm.getRelativeBucketIndex(this._displayedIndex))} / ${this._zvm.getRelativeBucketIndex(nowIndex)}</h2>
      <div>Birthdate: ${localBirthDate}</div>
      <!--<span>${this._state}</span>-->
      <!--<div>${Date.now()}</div>-->
      <canvas id="playfield" class="appCanvas"></canvas>
    `;
  }


  /** */
  fitCanvas(properties:PlaceProperties) {
      this._viewport?.fitWorld(false);
      this._viewport?.moveCenter(properties.canvasSize * IMAGE_SCALE / 2, properties.canvasSize * IMAGE_SCALE / 2);
      this.requestUpdate();
  }



  /** */
  onExit() {
    clearInterval(this._interval);
    this._viewport.destroy();
    this.dispatchEvent(new CustomEvent('exit', {detail: this.cell.dnaHash, bubbles: true, composed: true}));
  }

  /** Render for real-time editing of frame */
  renderNormal() {
    //console.log("<place-page> renderNormal()");
    /** Frame consts */
    const maybeProperties = this._zvm.getMaybeProperties()
    const nowMs: number = Date.now()
    const nowSec = Math.floor(nowMs / 1000)
    const nowIndex = this._zvm.epochToBucketIndex(nowSec)
    const nowDate = new Date(nowIndex * maybeProperties!.bucketSizeSec * 1000)
    const startDate = new Date(maybeProperties!.startTime * 1000)
    const localBirthDate = startDate.toLocaleString()
    //console.log({nowDate})
    const timeDiff = nowSec - maybeProperties!.startTime
    //const stored = Object.values(this._store.snapshotStore);
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
      if (nextIn === maybeProperties!.bucketSizeSec) {
        this._pixelsPlaced = 0
      }
      timeUi = html`
        <div class="center">Next in</div>
        <div class="center">${nextIn} secs</div>
      `
    }

    /** Build snapshot button list */
    //let snapshotButtons: any[] = [] //this.buildSnapshotButtons(nowIndex)

    /** Build TimeTravel UI */
    let timeTravelUi =
      html`
        <lit-flatpickr id="my-date-picker" enableTime dateFormat="m-d H:i" theme="dark" style="font-size:small; margin-top:3px;"
                       placeHolder="Select Date..."
                       minuteIncrement=${Math.floor(maybeProperties!.bucketSizeSec / 60)}
                       .minDate=${startDate} .maxDate=${nowDate}
                       .onOpen="${() => {
                         //console.log("my-date-picker onOpen!");
                         this._canAutoRefresh = false;
                       }}"
                       .onClose="${async (dates:any) => {
                         //console.log("my-date-picker onClose!", dates);
                         await this.onDatePicked(dates[0]);
                         this._canAutoRefresh = true;
                         await this.changeState(PlaceState.Loading);
                       }}"
        ></lit-flatpickr>`

    // .onChange=${(dates:any) => {this.onDatePicked(dates[0])}}

    /** Build placement logs */
    let displayedDetails = this._zvm.perspective.placements[this._displayedIndex];
    if (!displayedDetails) {
      this._zvm.getPlacementsAt(this._displayedIndex).then(() => this.requestUpdate())
      displayedDetails = [];
    }
    let placementDetails = displayedDetails.map((detail) => {
      return html`<li>{x: ${detail.placement.x}, y:${detail.placement.y}, color:${detail.placement.colorIndex}} - ${detail.author}</li>`
    })


    /** Build palette button list */
    //let palette = html``
    let palette = COLOR_PALETTE.map((color)=> {
      const extraClass = this._selectedColor == color? "selected" : "colorButton"
      return html`<button class="${extraClass}" style="background-color: ${color}"
                          @click=${() => {
                            this._selectedColor = color;
                            this.changeCursorMode("copy")
                            this.requestUpdate();
                          }}></button>`
    })

    const myRank = this._zvm.getMyRankAt(this._displayedIndex);
    const publishers = this._zvm.getPublishersAt(this._displayedIndex);

    let footer = html`<div style="min-height:10px;"></div>`;
    if (!this._canFullscreen) {
      footer = html`
        <div style="min-height:300px;">
          <div>Birthdate: ${localBirthDate}</div>
          <!--<div>Age: ${toHHMMSS(timeDiff.toString())}</div>-->
          <span>State: ${this._state}</span>
          <div>Displaying bucket: ${this._zvm.getRelativeBucketIndex(this._displayedIndex)} ${this._state == PlaceState.Live? " (live)" :""}</div>
          <div id="displayedIndexInfoDiv" style="min-height: 200px; margin-left: 20px;">
            <!--<div>Now: ${this._zvm.getRelativeBucketIndex(nowIndex)}</div>-->
            <div> - My render rank: ${myRank}</div>
            <div> - Publishers: ${publishers}</div>
            <span> - Placements:</span>
            <ol>${placementDetails}</ol>
            <br/>
          </div>
        </div>
      `
    }

    // return html`
    //   <!-- <div class="appCanvas"></div>-->
    //   <canvas id="playfield" class="appCanvas"></canvas>
    //   <div id="loading-overlay" class="loading style-2" .hidden=${this._hideOverlay}><div class="loading-wheel"></div></div>
    // `;

    /** render all */
    return html`
        <div id="horizontal-div" style="display:flex; flex-direction:row;; height: 100%;">
          <div style="width:84px; display:flex; flex-direction:column">
            <button style="margin:0px 5px 5px 5px;" @click=${() => {this.onExit()}}>Exit</button>
            <button class=" ${this._selectedColor? "colorButton" : "selected"} " style=""
                    @click=${() => {
                      this.disableCursor()
                      this.requestUpdate();
                    }}>None</button>
            ${palette}
            <hr>
            <div class="center" style="margin-bottom: 4px;">Zoom<div>${Math.round(this._viewport?.scale.x * 100)}%</div></div>
            <button style="margin:5px;" @click=${() => this.fitCanvas(maybeProperties!)}>Fit</button>
            <hr>
            ${timeUi}
            <hr>
            <div class="center">Pixels left:</div>
            <div class="center">${maybeProperties!.pixelsPerBucket - this._pixelsPlaced}</div>
            <hr>
            <div class="center">View</div>
              <!--<div>Latest stored: ${this._zvm.getRelativeBucketIndex(this._zvm.latestStoredBucketIndex)}</div>-->
            ${timeTravelUi}
            <button style="margin:5px;"
                    .disabled=${this._state == PlaceState.Live}
                    @click=${async () => {
                      this.datePickerElem.clear();
                      this._requestingSnapshotIndex = 0
                      await this.changeState(PlaceState.Loading)
                    }}>
              Live
            </button>
            <button style="margin:0px 5px 5px 5px" @click=${async() => {await this.refresh()}}>Refresh</button>
            <button style="margin:0px 5px 5px 5px;" @click=${() => {this.takeScreenshot()}}>Save</button>
            <button style="margin:0px 5px 5px 5px;" @click=${() => {
              this._canFullscreen = !this._canFullscreen;
              //this._mustInitPixi = true;
              this.requestUpdate();}}>Details</button>
          </div>
          <div id="vertical-div" style="display:flex; flex-direction:column; width:100%;">
            <canvas id="playfield" class="appCanvas" style=""></canvas>
            ${footer}
        </div>
      </div>
      <div id="loading-overlay" class="loading style-2" .hidden=${this._hideOverlay}><div class="loading-wheel"></div></div>
    `;
  }


  /** */
  static get scopedElements() {
    return {
    };
  }

  static get styles() {
    return [
      sharedStyles,
      css`
        hr {
          /*border: 0;*/
          /*border-top: 1px solid #01091f;*/
          width: 60px;
          margin: 8px 10px 5px 8px;
          border: 0.1em solid gray;
        }

        .center {
          margin-left: auto;
          margin-right: auto;
        }

        .loading {
          width: 100%;
          height: 100%;
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          background-color: rgba(0, 0, 0, .5);
        }

        .loading-wheel {
          width: 20px;
          height: 20px;
          margin-top: -40px;
          margin-left: -40px;

          position: absolute;
          top: 50%;
          left: 50%;

          border-width: 30px;
          border-radius: 50%;
          -webkit-animation: spin 1s linear infinite;
        }

        .style-2 .loading-wheel {
          border-style: double;
          border-color: #ccc transparent;
        }

        @-webkit-keyframes spin {
          0% {
            -webkit-transform: rotate(0);
          }
          100% {
            -webkit-transform: rotate(-360deg);
          }
        }

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
          max-width: 50px;
          margin-top: 5px;
          margin-left: 15px;
        }

        .colorButton {
          min-height: 30px;
          max-width: 50px;
          margin-top: 5px;
          margin-left: 15px;
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
