import {css, html, LitElement} from "lit";
import {property, state} from "lit/decorators.js";

import {contextProvided} from "@holochain-open-dev/context";
import {StoreSubscriber} from "lit-svelte-stores";

import {sharedStyles} from "../sharedStyles";
import {Dictionary, PieceType, Play, whereContext} from "../types";
import {PlaceStore} from "../place.store";
import {SlAvatar, SlBadge, SlColorPicker, SlTooltip} from '@scoped-elements/shoelace';
import {ScopedElementsMixin} from "@open-wc/scoped-elements";
import {
  Button,
  Drawer,
  Formfield,
  Icon,
  IconButton, IconButtonToggle,
  List,
  ListItem,
  Menu,
  Select,
  Slider,
  Switch,
  TextField,
  TopAppBar,
} from "@scoped-elements/material-web";
import {AgentPubKeyB64, EntryHashB64} from "@holochain-open-dev/core-types";
import {CellId} from "@holochain/client/lib/types/common";

export const delay = (ms:number) => new Promise(r => setTimeout(r, ms))

/**
 * @element place-controller
 */
export class PlaceController extends ScopedElementsMixin(LitElement) {
  constructor() {
    super();
  }

  /** Dependencies */

  @contextProvided({ context: whereContext })
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



  /** Launch init when myProfile has been set */
  private subscribePlay() {
    this._store.plays.subscribe(async (plays) => {
      if (!this._currentSpaceEh) {
        /** Select first play */
        const firstSpaceEh = this.getFirstVisiblePlay(plays);
        if (firstSpaceEh) {
          await this.selectPlay(firstSpaceEh);
          console.log("starting Template: ", /*templates[this._currentTemplateEh!].name,*/ this._currentTemplateEh);
          console.log("    starting Play: ", plays[firstSpaceEh].space.name, this._currentSpaceEh);
          //console.log(" starting Session: ", plays[firstSpaceEh].name, this._currentSpaceEh);
        }
      }
    });
  }

  /** After first render only */
  async firstUpdated() {
    console.log("place-controller first updated!")
    this.subscribePlay();
  }

  /** After each render */
  async updated(changedProperties: any) {
    if (this._canPostInit) {
      this.postInit();
    }
    // look for canvas in plays and render them
    for (let spaceEh in this._plays.value) {
      let play: Play = this._plays.value[spaceEh];
      if (play.space.surface.canvas && play.visible) {
        const id = play.space.name + '-canvas'
        const canvas = this.shadowRoot!.getElementById(id) as HTMLCanvasElement;
        if (!canvas) {
          console.debug("CANVAS not found for " + id);
          continue;
        }
        //console.log({canvas})
        var ctx = canvas.getContext("2d");
        if (!ctx) {
          console.log("CONTEXT not found for " + id);
          continue;
        }
        //console.log({ctx})
        //console.log("Rendering CANVAS for " + id)
        try {
          let canvas_code = prefix_canvas(id) + play.space.surface.canvas;
          var renderCanvas = new Function(canvas_code);
          renderCanvas.apply(this);
        } catch (e) {}
      }
    }
  }


  private getFirstVisiblePlay(plays: Dictionary<Play>): null| EntryHashB64 {
    if (Object.keys(plays).length == 0) {
      return null;
    }
    for (let spaceEh in plays) {
      const play = plays[spaceEh]
      if (play.visible) {
        return spaceEh
      }
    }
    return null;
  }


  /**
   * Called once a profile has been set
   */
  private async init() {
    this._initializing = true
    console.log("place-controller.init() - START");
    /** Get latest public entries from DHT */
    await this._store.pullDht();
    const snapshots = this._plays.value;
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
    if (this._currentSpaceEh) {
      // console.log("Pinging All")
      await this._store.pingOthers(this._currentSpaceEh, this._profiles.myAgentPubKey)
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
  <div>
    <!-- APP BODY -->
    <div class="appBody">
    </div>
  </div>
`;
  }

  static get scopedElements() {
    return {
      "place-snapshot": PlaceSnapshot,
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
