import {css, html, LitElement} from "lit";
import {property} from "lit/decorators.js";

import * as PIXI from 'pixi.js'
//import {SCALE_MODES} from 'pixi.js'
import {Viewport} from 'pixi-viewport'

import {contextProvided} from "@holochain-open-dev/context";

import {sharedStyles} from "../sharedStyles";
import {destructurePlacement, placeContext, PlacementEntry, PlaceState, snapshot_to_str, SnapshotEntry} from "../types";
import {PlaceStore} from "../place.store";
import {SlBadge, SlTooltip} from '@scoped-elements/shoelace';
import {ScopedElementsMixin} from "@open-wc/scoped-elements";
import {color2index, COLOR_PALETTE, IMAGE_SCALE} from "../constants";
import {buffer2Texture, randomSnapshotData, setPixel, snapshotIntoFrame} from "../imageBuffer";
import tinycolor from "tinycolor2";

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


  /** PIXI Elements */

  _pixiApp: any = undefined;
  _grid: any = undefined;
  _viewport: any = undefined;
  _frameSprite: any = undefined;
  _frameBuffer: Uint8Array = new Uint8Array();
  _cursor: any = undefined;

  /** Private properties */
  _state: PlaceState = PlaceState.Uninitialized;
  _transitioning = false;
  //_latestStoredBucketIndex: number = 0;
  _canAutoRefresh = true;
  _displayedIndex: number = 0;
  _selectedColor: string | null = null;
  _hideOverlay = false;

  _localSnapshotIndexes: any = [];

  _mustInitPixi: boolean = true;

  _requestingSnapshotIndex: number | null = null; // 0 = Live, otherwise the actual snapshot index


  /** Getters */

  get playfieldElem(): HTMLCanvasElement {
    return this.shadowRoot!.getElementById("playfield") as HTMLCanvasElement;
  }

  get datePickerElem(): any {
    return this.shadowRoot!.getElementById("my-date-picker");
  }

  get loadingOverlayElem(): HTMLDivElement {
    return this.shadowRoot!.getElementById("loading-overlay") as HTMLDivElement;
  }

  /** Launch init when myProfile has been set */
  // private async subscribeSnapshots() {
  //   this._store.snapshots.subscribe(async (snapshots) => {
  //     if (g_state != PlaceState.Initializing && g_state != PlaceState.Initialized) {
  //      await this.init();
  //     }
  //   });
  // }


  /** After first render only */
  async firstUpdated() {
    console.log("place-controller first update done!")
    //await this.subscribeSnapshots();
    await this.init();
  }


  /** After each render */
  async updated(changedProperties: any) {
    if (this._state == PlaceState.Initialized) {
      this.postInit();
    }
    /* Init canvas for normal render */
    if (this._state == PlaceState.Live) {
      if (this._mustInitPixi) {
        const properties = await this._store.getProperties()
        this.initPixiApp(this.playfieldElem, properties.canvasSize)
        this._mustInitPixi = false;
     }
    }
  }


  /** Called once subscribed to stores */
  private async init() {
    console.log("place-controller.init() - START!");
    await this.changeState(PlaceState.Initializing)

    /** Wait a second for pixi to startup? */
    await delay(1 * 1000);

    /** Get latest snapshot from DHT and store it */
    await this._store.pullLatestSnapshotFromDht();
    console.log("Latest in store: " + snapshot_to_str(this._store.getLatestStoredSnapshot()!))

    /** Store all local snapshots */
    console.log("Calling getLocalSnapshots()...")
    try {
      this._localSnapshotIndexes = await this._store.getLocalSnapshots();
    } catch (e) {
      console.log("Calling getLocalSnapshots() failed")
    }
    console.log("g_localSnapshotIndexes.length = ", this._localSnapshotIndexes.length)
    //console.log({g_localSnapshotIndexes})


    /** Done */
    await this.changeState(PlaceState.Initialized);
    console.log("place-controller.init() - DONE");
  }



  /** */
  initPixiApp(canvas: HTMLCanvasElement, worldSize: number) {
    console.log("Pixi canvas '" + canvas.id + "': " + canvas.offsetWidth + "x" + canvas.offsetHeight)
    /** Setup PIXI app */
    this._pixiApp = new PIXI.Application({
      //antialias: true,
      view: canvas,
      backgroundColor: 0x111111,
      width: canvas.offsetWidth,
      height: canvas.offsetHeight,
      preserveDrawingBuffer: true,
      //resolution: devicePixelRatio,
      //resizeTo: canvas
    })
    this._pixiApp.view.style.textAlign = 'center'
    //container.appendChild(g_pixiApp.view)

    this._pixiApp.renderer.plugins.interaction.cursorStyles.default = "grab";
    this._pixiApp.renderer.plugins.interaction.cursorStyles.copy = "copy";
    this._pixiApp.renderer.plugins.interaction.cursorStyles.grab = "grab";

    /** Setup viewport */

    this._viewport = new Viewport({
      passiveWheel: false,                // whether the 'wheel' event is set to passive (note: if false, e.preventDefault() will be called when wheel is used over the viewport)
      //screenWidth: canvas.offsetWidth,              // screen width used by viewport (eg, size of canvas)
      //screenHeight: canvas.offsetHeight            // screen height used by viewport (eg, size of canvas)
    })

    // TODO: remove this workaround (otherwise we get an error on undefined object)
    this._viewport.trackedPointers = []

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
    if (this._store.latestStoredBucketIndex != 0) {
      //const snapshots = this._snapshots.value;
      const snapshot = this._store.snapshotStore[this._store.latestStoredBucketIndex];
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
    this._frameSprite.on('pointerdown', async (event:any) => {
      //console.log({event})
      let custom = new PIXI.Point(event.data.global.x, event.data.global.y)
      //custom.x -= this.playfieldElem.offsetLeft
      custom.y -= this.playfieldElem.offsetTop
      let customPos;
      customPos = event.data.getLocalPosition(this._frameSprite, customPos, custom)
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
      if (this._selectedColor && this._displayedIndex > this._store.latestStoredBucketIndex) {
        this._cursor.visible = true;
        const placement = {
          x: Math.floor(customPos.x),
          y: Math.floor(customPos.y),
          colorIndex: color2index(this._selectedColor),
        };

        this._cursor.x = Math.floor(customPos.x) * IMAGE_SCALE
        this._cursor.y = Math.floor(customPos.y) * IMAGE_SCALE

        try {
          // this._store.placePixelAt({
          //   placement,
          //   bucket_index: this._store.latestStoredBucketIndex
          // })
          await this._store.placePixel(placement)
          const tiny = new tinycolor(this._selectedColor)
          const colorNum = parseInt(tiny.toHex(), 16);
          setPixel(this._frameBuffer, colorNum, customPos, worldSize);
          let updatedTexture = buffer2Texture(this._frameBuffer, worldSize)
          this._frameSprite.texture = updatedTexture
        } catch(e) {
          console.error("Failed to place pixel: ", e)
          alert("Pixel already placed for this time unit")
        }
        // await this.transitionToLive(packPlacement(placement))
      }
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
      //console.log("zoomed event fired: " + viewport.scale.x)
      //console.log({e})
      this._grid.visible = this._viewport.scale.x > 2;
      this.requestUpdate()
    })
    this._viewport.fitWorld(true)

    /** DEBUG ; without viewport **/
    // g_pixiApp.stage.addChild(g_frameSprite)
    // //g_pixiApp.stage.addChild(grid)
    // g_pixiApp.stage.addChild(g_cursor)
    // g_pixiApp.stage.addChild(logText)
  }


  /** Called once after first update after init is done */
  private async postInit() {
    console.log("place-controller.postInit() - START!");
    const properties = await this._store.getProperties()
    console.log({properties})

    this.initPixiApp(this.playfieldElem, properties.canvasSize)

    /** Display latest stored snapshot */
    let maybeLatestStored = this._store.getLatestStoredSnapshot()
    console.log({maybeLatestStored})
    if (maybeLatestStored) {
      this.viewSnapshot(maybeLatestStored, properties.canvasSize);
    }

    /** Start refresh loop  and try to publish snapshot every second */
    setInterval(async () => {
      if (!this._canAutoRefresh) {
        return;
      }
      this._canAutoRefresh = false;
      console.log("Try publishing snapshot...")
      if (!this.debugMode) {
        await this.publishNowSnapshot(Date.now() / 1000);
      }
      this.requestUpdate()
      this._canAutoRefresh = true;
    }, 1 * 1000);


    this._requestingSnapshotIndex = 0
    const succeeded = await this.changeState(PlaceState.Loading);
    console.log("place-controller.postInit() - DONE");
  }


  /** Get snapshot from DHT or publish it yourself */
  private async publishToNow(nowIndex?: number) {
    const nowIndex2 = nowIndex? nowIndex: this._store.epochToBucketIndex(Date.now() / 1000)
    let nowSnapshot = await this._store.getSnapshotAt(nowIndex2);
    if (!nowSnapshot) {
      await this._store.publishUpTo(nowIndex2, this.onPublish, this);
      //const succeeded = await this.transitionToLive();
      //if (!succeeded) {
        //this._requestingSnapshotIndex = nowIndex2 - 1
        //await this.changeState(PlaceState.Loading)
      //}
      //this._requestingSnapshotIndex = 0;
    }
  }


  /** Callback for this.publishToNow() */
  private onPublish(snapshot: SnapshotEntry, cbData?: PlaceController): void {
    console.log("onPublish() called: " + snapshot.timeBucketIndex)
    if (cbData) {
      cbData.viewSnapshot(snapshot, cbData._store.getMaybeProperties()!.canvasSize)
      cbData.requestUpdate();
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
      if (this._state == PlaceState.Live && nowIndex > this._displayedIndex) {
        // await this.refresh()
        await this.transitionToLive()
      }
      return;
    }
    //const res = await this._store.publishNextSnapshotAt(nowIndex - 1)
    const res = await this._store.publishNextSnapshot(nowSec)
    console.log("publishNowSnapshot() " + nowIndex + ": " + (res? "SUCCEEDED" : "FAILED"));
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
  async viewFutureSnapshot(snapshot: SnapshotEntry, placements: PlacementEntry[]) {
    //console.log(`viewFutureSnapshot() adding ${placements.length} placements to index ` + this._store.getRelativeBucketIndex(snapshot.timeBucketIndex))
    /* Update frame with current bucket placements */
    const properties = await this._store.getProperties()
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
  viewSnapshot(snapshot: SnapshotEntry, worldSize: number) {
    this._displayedIndex = snapshot.timeBucketIndex
    console.log("frame set to: " + this._store.getRelativeBucketIndex(snapshot.timeBucketIndex));
    this._frameBuffer = snapshotIntoFrame(snapshot.imageData, worldSize);
    if (this._frameSprite) {
      this._frameSprite.texture = buffer2Texture(this._frameBuffer, worldSize);
    }
  }


  /** */
  async viewSnapshotAt(iBucketIndex: number): Promise<boolean> {
    this._hideOverlay = false;
    this._cursor.visible = false;
    //const placements = await this._store.getPlacementsAt(iBucketIndex)
    const maybeSnapshot = await this._store.getSnapshotAt(iBucketIndex)
    if (maybeSnapshot) {
      this.viewSnapshot(maybeSnapshot, this._store.getMaybeProperties()!.canvasSize);
      this.requestUpdate();
    }
    this._hideOverlay = true;
    return true;
  }


  /** */
  changeCursorMode(cursorMode: String) {
    this._pixiApp.renderer.plugins.interaction.cursorStyles.default = cursorMode
    this._pixiApp.renderer.plugins.interaction.setCursorMode(cursorMode)
  }


  /** */
  async refresh() {
    //console.log("refresh(): Pulling data from DHT")
    await this._store.pullLatestSnapshotFromDht()
    //g_localSnapshotIndexes = await this._store.getLocalSnapshots();
    // const latestStored = this._store.getLatestStoredSnapshot();
    // if (!latestStored) {
    //   return;
    // }
    // const properties =  await this._store.getProperties();
    // if (latestStored.timeBucketIndex > 0) {
    //   this.setFrame(latestStored, properties.canvasSize);
    // }
    // if(g_canViewLive) {
    //   await this.transitionToLive()
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


  /** */
  async onDatePicked(date:Date) {
    //console.log("onDatePicked called: ", date)
    const bucketIndex = this._store.epochToBucketIndex(date.getTime() / 1000)
    //console.log("onDatePicked bucketIndex: ", this._store.getRelativeBucketIndex(bucketIndex), bucketIndex)
    this._requestingSnapshotIndex = bucketIndex
  }


  /** */
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
  async requestSnapshot(index: number) {
    this._requestingSnapshotIndex = index;
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
      case PlaceState.Live: {
        // if (newState == PlaceState.Publishing) {
        //   this.publishToNow().then(_ => this.changeState(PlaceState.Loading))
        // } else {
          if (newState == PlaceState.Loading) {
            this.transitionToLoading()
          } else {
            console.error("Invalid state transition request Live", this._state, newState);
            return false;
          }
        //}
        break;
      }
      case PlaceState.Retrospection: {
        if (newState == PlaceState.Loading) {
          this.transitionToLoading()
        } else {
          console.error("Invalid state transition request Retro", this._state, newState);
          return false;
        }
        break;
      }
      case PlaceState.Publishing: {
        if (newState == PlaceState.Loading) {
          this.transitionToLoading()
        } else {
          console.error("Invalid state transition request Publishing", this._state, newState);
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
  async transitionToLive(currentPlacement?: PlacementEntry): Promise<boolean> {
    //console.log("transitionToLive()...")
    // /* pixi must be initiazed */

    this._cursor.visible = false;

    await this._store.pullLatestSnapshotFromDht()

    /* Latest must correspond to 'now' */
    let latest = this._store.getLatestStoredSnapshot();
    if (!latest) {
      console.warn("transitionToLive() aborting: no latest snapshot stored")
      return false;
    }
    const nowIndex = this._store.epochToBucketIndex(Date.now() / 1000)
    const nowSnapshotIndex = nowIndex - (nowIndex % this._store.getMaybeProperties()!.snapshotIntervalInBuckets);
    if (latest.timeBucketIndex != nowSnapshotIndex) {
      console.warn("transitionToLive() latest.timeBucketIndex != nowSnapshotIndex", latest.timeBucketIndex, nowSnapshotIndex)
      return false;
    }

    /* Create future frame */
    let placements: PlacementEntry[] = [];
    for(let i = nowSnapshotIndex; i <= nowIndex; i++) {
      const current: PlacementEntry[] = await this._store.getPlacementsAt(i);
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
    this._mustInitPixi = true;
  }


  /** */
  async transitionToRetrospection() {
    await this.viewSnapshotAt(this._requestingSnapshotIndex!)
    this.disableCursor();
    this._requestingSnapshotIndex = null;
    //this.loadingOverlayElem.hidden = true;
    this._hideOverlay = true;
  }



  /** Render the current state */
  render() {
    //console.log("place-controller render() - " + this._state);
    switch(this._state) {
      case PlaceState.Uninitialized:
      case PlaceState.Initializing: return this.renderStartup(); break;
      case PlaceState.Initialized:
      //case PlaceState.PostInitialized:
      case PlaceState.Publishing: return this.renderPublishToNow(); break;
      case PlaceState.Live: return this.renderNormal(); break;
      case PlaceState.Retrospection: return this.renderNormal(); break;
      case PlaceState.Loading: {

        let maybeLatestStored = this._store.getLatestStoredSnapshot()
        console.log({maybeLatestStored})
        if (!maybeLatestStored) {
          return;
        }

        /** Check if we need to sync. Also we may need to sync again after a sync if a sync takes too long */
        let nowIndex = 0
        //do {
          nowIndex = this._store.epochToBucketIndex(Date.now() / 1000);
          nowIndex -=  nowIndex % this._store.getMaybeProperties()!.snapshotIntervalInBuckets;

          if (maybeLatestStored!.timeBucketIndex < nowIndex) {
            this.changeState(PlaceState.Publishing);
            return;
            //await this.publishToNow(nowIndex);
          }
          //maybeLatestStored = this._store.getLatestStoredSnapshot()
        //} while(maybeLatestStored!.timeBucketIndex != nowIndex)

        if (this._requestingSnapshotIndex == null || this._requestingSnapshotIndex == 0) {
          this.changeState(PlaceState.Live).then(succeeded => {
            if (!succeeded) {
              this.changeState(PlaceState.Publishing);
            }
          })
        } else {
          this.changeState(PlaceState.Retrospection)
        }
      }
      default: break;
    }
    return this.renderNormal();
  }


  disableCursor() {
    this._selectedColor = null;
    this._cursor.visible = false;
    this.changeCursorMode("grab")
  }

  /** */
  renderStartup() {
    return html`
        <span>Loading...</span>
        <!--<span>${this._state}</span>-->
        <!--<canvas id="playfield" class="appCanvas"></canvas>-->
      `;
  }


  /** Render to do when syncing to latest frame */
  renderPublishToNow() {
    let localBirthDate = new Date(this._store.getMaybeProperties()!.startTime * 1000).toLocaleString()
    const nowIndex = this._store.epochToBucketIndex(Date.now() / 1000)
    /** */
    return html`
      <canvas id="playfield" class="appCanvas"></canvas>
      <h2>Publishing snapshots up to current time... ${Math.max(0, this._store.getRelativeBucketIndex(this._displayedIndex))} / ${this._store.getRelativeBucketIndex(nowIndex)}</h2>
      <div>Birthdate: ${localBirthDate}</div>
      <span>${this._state}</span>
      <!--<div>${Date.now()}</div>-->
    `;
  }


  /** Render for real-time editing of frame */
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
                       .onOpen="${() => {
                         //console.log("my-date-picker onOpen!");
                         this._canAutoRefresh = false;
                       }}"
                       .onClose="${(dates:any) => {
                         //console.log("my-date-picker onClose!", dates);
                         this.onDatePicked(dates[0]);
                         this._canAutoRefresh = true;
                         this.changeState(PlaceState.Loading);
                       }}"
        ></lit-flatpickr>`
      //html`<input id="dateInput" type="text" placeholder="Select Date..." readonly="readonly">`

    //                        .onChange=${(dates:any) => {this.onDatePicked(dates[0])}}

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
      const extraClass = this._selectedColor == color? "selected" : "colorButton"
      return html`<button class="${extraClass}" style="background-color: ${color}"
                          @click=${() => {
                            this._selectedColor = color;
                            this.changeCursorMode("copy")
                            this.requestUpdate();
                          }}></button>`
    })

    const myRank = this._store.getMyRankAt(this._displayedIndex);
    const publishers = this._store.getPublishersAt(this._displayedIndex);


    /** render all */
    return html`
      <div style="display: flex;flex-direction: row">
        <div style="width:80px;display: flex;flex-direction: column">
          <button class=" ${this._selectedColor? "colorButton" : "selected"} " style=""
                  @click=${() => {
                    this.disableCursor()
                    this.requestUpdate();
                  }}>None</button>
          ${palette}
          <br/>
          <div>Zoom:</div>
          <div>${Math.round(this._viewport?.scale.x * 100)}%</div>
          <button style="margin:5px;" @click=${() => {
            this._viewport?.fitWorld(false);
            this._viewport?.moveCenter(maybeProperties!.canvasSize * IMAGE_SCALE / 2, maybeProperties!.canvasSize * IMAGE_SCALE / 2);
            this.requestUpdate();
          }}>Fit</button>
          <button style="margin:5px;" @click=${() => {this.takeScreenshot()}}>Save</button>
          <button style="margin:5px;" @click=${async() => {
            await this.refresh()
            try {
              this._localSnapshotIndexes = await this._store.getLocalSnapshots();
            } catch(e) {
              console.log("Calling getLocalSnapshots() failed", e)
            }
            console.log("g_localSnapshotIndexes.length = ", this._localSnapshotIndexes.length)
            }}>Refresh</button>
          ${timeUi}
            <!--<div> latest local: ${this._localSnapshotIndexes.length > 0 ? this._localSnapshotIndexes[0] : 0}</div>>-->
           <!--<div>stored: ${stored.length}</div>>-->
        </div>
        <canvas id="playfield" class="appCanvas"></canvas>
      </div>
      <div>Birthdate: ${localBirthDate}</div>
      <!--<div>Age: ${toHHMMSS(timeDiff.toString())}</div>-->
      <div id="timeTravelDiv">
        <div>View:</div>
          <!--<div>Latest stored: ${this._store.getRelativeBucketIndex(this._store.latestStoredBucketIndex)}</div>-->
        ${timeTravelUi}
        <button class="" style=""
                .disabled=${this._state == PlaceState.Live}
                @click=${async () => {
          this.datePickerElem.clear();
          this._requestingSnapshotIndex = 0
          await this.changeState(PlaceState.Loading)
        }}>Live</button>
      </div>
      <span>State: ${this._state}</span>
      <div>Displaying bucket: ${this._store.getRelativeBucketIndex(this._displayedIndex)} ${this._state == PlaceState.Live? " (live)" :""}</div>
      <div id="displayedIndexInfoDiv" style="min-height: 200px; margin-left: 20px;">
        <!--<div>Now: ${this._store.getRelativeBucketIndex(nowIndex)}</div>-->
        <div> - My render rank: ${myRank}</div>
        <div> - Publishers: ${publishers}</div>
        <span> - Placements:</span>
        <ol>${placementDetails}</ol>
        <br/>
      </div>
      <div id="loading-overlay" class="loading style-2" .hidden=${this._hideOverlay}><div class="loading-wheel"></div></div>
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
        .loading {
          width: 100%;
          height: 100%;
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          background-color: rgba(0,0,0,.5);
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
