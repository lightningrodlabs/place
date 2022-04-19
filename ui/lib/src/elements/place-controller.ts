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
import {Texture} from "pixi.js";

export const delay = (ms:number) => new Promise(r => setTimeout(r, ms))

export const WORLD_WIDTH = 1000
export const WORLD_HEIGHT = 1000


function rand(n: number) {
  return Math.round(Math.random() * n)
}


// function initPixiApp(container: HTMLCanvasElement) {
//   console.log(container.id + ": " + container.offsetWidth + "x" + container.offsetHeight)
//
//   // let ctx = container.getContext("2d");
//   // for (var v=0; v < container.offsetHeight; v += 5) {
//   //   for (var h=0; h < container.offsetWidth; h += 5) {
//   //     const lum = Math.floor( Math.random() * 50 );
//   //     ctx!.fillStyle = "hsl(0, 0%," + lum + "%)";
//   //     ctx!.fillRect(h,v, 5, 5);
//   //   }
//   // }
//
//   /** Setup PIXI app */
//
//   const app = new PIXI.Application({
//     //antialias: true,
//     view: container,
//     backgroundColor: 0x262A2D,
//     width: container.offsetWidth,
//     height: container.offsetHeight,
//     resolution: devicePixelRatio
//   })
//   app.view.style.textAlign = 'center'
//
//   // add a red box
//   var sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
//   sprite.tint = 0xff0000;
//   sprite.width = sprite.height = 100
//   sprite.position.set(100, 100);
//   app.stage.addChild(sprite)
// }


function initPixiApp(canvas: HTMLCanvasElement) {
  console.log(canvas.id + ": " + canvas.offsetWidth + "x" + canvas.offsetHeight)
  /** Setup PIXI app */
  const app = new PIXI.Application({
    //antialias: true,
    view: canvas,
    backgroundColor: 0x111111,
    width: canvas.offsetWidth,
    height: canvas.offsetHeight,
    resolution: devicePixelRatio
  })
  app.view.style.textAlign = 'center'
  //container.appendChild(app.view)


  /** Setup viewport */

  const viewport = new Viewport({
    passiveWheel: false,                            // whether the 'wheel' event is set to passive (note: if false, e.preventDefault() will be called when wheel is used over the viewport)
    screenWidth: canvas.offsetWidth,              // screen width used by viewport (eg, size of canvas)
    screenHeight: canvas.offsetHeight,            // screen height used by viewport (eg, size of canvas)
    //screenWidth: app.view.offsetWidth,
    //screenHeight: app.view.offsetHeight
    //interaction: app.renderer.plugins.interaction // the interaction module is important for wheel to work properly when renderer.view is placed or scaled
  })

  viewport.trackedPointers = []

  app.stage.addChild(viewport)

  viewport
    .moveCenter(WORLD_WIDTH / 2, WORLD_HEIGHT / 2)
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
    maxWidth: WORLD_WIDTH * 10,
    maxHeight: WORLD_HEIGHT * 10,
  })

  /** DRAW STUFF */
  //Borders
  const border = viewport.addChild(new PIXI.Graphics())
  border
    .lineStyle(1, 0xff0000)
    .drawRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)


  // // add a red box
  // var sprite = viewport.addChild(new PIXI.Sprite(PIXI.Texture.WHITE));
  // sprite.tint = 0xff0000;
  // sprite.width = sprite.height = 100
  // sprite.position.set(100, 100);
  // sprite.interactive = true;
  // sprite.on('pointerdown', () => console.log("square clicked"))

  // const toto = PIXI.GLTexture.fromSource()
  //
  // let colorz = new Uint32Array(4*WORLD_WIDTH*WORLD_HEIGHT);
  // const texture = Texture.from(colorz, {width: WORLD_WIDTH,  height: WORLD_HEIGHT});

  // Draw a million pixels
  //let container = new PIXI.ParticleContainer(WORLD_HEIGHT * WORLD_WIDTH)
  //container.interactive = true;

  for (let i = 0; i < WORLD_HEIGHT / 1; i++) {
    for (let j = 0; j < WORLD_WIDTH / 1; j++) {
      //const graphics = PIXI.Sprite.from(PIXI.Texture.WHITE);
      const graphics = PIXI.Sprite.from('one_pixel.png');
      graphics.tint = rand(0xffffff)
      graphics.x = i// * 16;
      graphics.y = j// * 16;
      graphics.interactive = true;
      graphics.on('pointerdown', () => console.log("pixel: " + i + "x" + j))
      viewport.addChild(graphics)
    }
  }
  //viewport.addChild(container)
}


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
      this.postInit();
    }
    if (this._initialized) {
      initPixiApp(this.playfieldElem)
    }

    //     const id = "playfield"
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
      return html`
        <span>Loading...</span>
      `;
    }

    return html`
      <div>Playfield:</div>
      <canvas id="playfield" class="appBody"></canvas>
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
