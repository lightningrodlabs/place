import {css, html, LitElement} from "lit";
import {property, state} from "lit/decorators.js";

import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'

import {contextProvided} from "@holochain-open-dev/context";
import {StoreSubscriber} from "lit-svelte-stores";

import {sharedStyles} from "../sharedStyles";
import {Dictionary,  placeContext} from "../types";
import {PlaceStore} from "../place.store";
import {SlBadge, SlTooltip} from '@scoped-elements/shoelace';
import {ScopedElementsMixin} from "@open-wc/scoped-elements";
import {AgentPubKeyB64, EntryHashB64} from "@holochain-open-dev/core-types";
import {CellId} from "@holochain/client/lib/types/common";

export const delay = (ms:number) => new Promise(r => setTimeout(r, ms))

export const WORLD_WIDTH = 5000
export const WORLD_HEIGHT = 5000


function rand(n: number) {
  return Math.round(Math.random() * n)
}


function initPixiApp(container: HTMLElement) {

  /** Setup PIXI app */

  console.log(container.id + ": " + container.offsetWidth)

  const app = new PIXI.Application({
    //antialias: true,
    backgroundColor: 0x262A2D,
    width: container.offsetWidth,
    height: container.offsetHeight,
    resolution: devicePixelRatio
  })
  app.view.style.textAlign = 'center'
  container.appendChild(app.view)



  /** Setup viewport */

  const viewport = new Viewport({
    passiveWheel: false,                            // whether the 'wheel' event is set to passive (note: if false, e.preventDefault() will be called when wheel is used over the viewport)
    //screenWidth: window.innerWidth,              // screen width used by viewport (eg, size of canvas)
    //screenHeight: window.innerHeight,            // screen height used by viewport (eg, size of canvas)
    //screenWidth: app.view.offsetWidth,
    //screenHeight: app.view.offsetHeight
  })

  app.stage.addChild(viewport)

  viewport
    .moveCenter(WORLD_WIDTH / 2, WORLD_HEIGHT / 2)
    .drag()
    .pinch()
    .decelerate()
    .wheel({})

  //viewport.bounce({})

  viewport.clamp({direction: 'all'})

  viewport.clampZoom({
    minWidth: container.offsetWidth / 10,
    minHeight: container.offsetHeight / 10,
    maxWidth: WORLD_WIDTH,
    maxHeight: WORLD_HEIGHT,
  })

  /** DRAW STUFF */
  // Borders
  const graphics = viewport.addChild(new PIXI.Graphics())
  graphics
    .lineStyle(10, 0xff0000)
    .drawRect(0, 0, viewport.worldWidth, viewport.worldHeight)
    .lineStyle(0, 0x00FF00)
  // stars
  for (let i = 0; i < 200; i++) {
    //const sprite = new PIXI.Sprite(PIXI.Texture.WHITE)
    //viewport.addChild(sprite)
    //sprite.tint = rand(0xffffff)
    //sprite.position.set(rand(WORLD_WIDTH), rand(WORLD_HEIGHT))
    graphics
      .beginFill(rand(0xffffff))
      .drawCircle(rand(WORLD_WIDTH), rand(WORLD_HEIGHT), 10)
      .endFill()

  }
  // Quadrillage
  graphics.lineStyle(1, 0x4E565F)
  for (let i = 0; i < WORLD_HEIGHT; i += 500) {
    graphics
      .moveTo(0, i)
      .lineTo(WORLD_WIDTH, i)
  }
  for (let i = 0; i < WORLD_WIDTH; i += 500) {
    graphics
      .moveTo(i, 0)
      .lineTo(i, WORLD_HEIGHT)
  }
}


/**
 * @element place-controller
 */
export class PlaceController extends ScopedElementsMixin(LitElement) {
  constructor() {
    super();
    initPixiApp(this.playfieldElem)
  }

  /** Dependencies */

  @contextProvided({ context: placeContext })
  _store!: PlaceStore;

  _snapshots = new StoreSubscriber(this, () => this._store.snapshots);


  /** Private properties */

  @state() _currentSnapshotEh: null | EntryHashB64 = null;

  private _initialized: boolean = false;
  private _initializing: boolean = false;
  private _canPostInit: boolean = false;


  // get snapshotElem(): WhereSpace {
  //   return this.shadowRoot!.getElementById("where-space") as WhereSpace;
  // }

  get playfieldElem() : HTMLDivElement {
    return this.shadowRoot!.getElementById("playfield") as HTMLDivElement;
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
        }
      }
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
      this.postInit();
    }
    // look for canvas in plays and render them
    // for (let spaceEh in this._plays.value) {
    //   let play: Play = this._plays.value[spaceEh];
    //   if (play.space.surface.canvas && play.visible) {
    //     const id = play.space.name + '-canvas'
    //     const canvas = this.shadowRoot!.getElementById(id) as HTMLCanvasElement;
    //     if (!canvas) {
    //       console.debug("CANVAS not found for " + id);
    //       continue;
    //     }
    //     //console.log({canvas})
    //     var ctx = canvas.getContext("2d");
    //     if (!ctx) {
    //       console.log("CONTEXT not found for " + id);
    //       continue;
    //     }
    //     //console.log({ctx})
    //     //console.log("Rendering CANVAS for " + id)
    //     try {
    //       let canvas_code = prefix_canvas(id) + play.space.surface.canvas;
    //       var renderCanvas = new Function(canvas_code);
    //       renderCanvas.apply(this);
    //     } catch (e) {}
    //   }
    // }
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
    this.requestUpdate();
    console.log("place-controller.init() - DONE");
  }

  private postInit() {
    this._canPostInit = false;
  }



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
      return html`<span>Loading...</span>`;
    }

    return html`
      <div>Playfield:</div>
      <div id="playfield" class="appBody"></div>
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
        :host {
          margin: 10px;
        }

        .appBody {
          width: 100%;
          min-height: 400px;
          margin-top: 2px;
          margin-bottom: 0px;
          display:flex;
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
