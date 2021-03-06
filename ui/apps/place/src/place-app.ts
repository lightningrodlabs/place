import {ContextProvider} from "@holochain-open-dev/context";
import {serializeHash} from '@holochain-open-dev/core-types';
import { state } from "lit/decorators.js";
import {
  PlaceController,
  PlaceStore,
  placeContext,
} from "@place/elements";
import {HolochainClient} from "@holochain-open-dev/cell-client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html } from "lit";
import {CellId} from "@holochain/client";

let APP_ID = 'place'
let HC_PORT:any = process.env.HC_PORT;
let NETWORK_ID: any = null
export const IS_ELECTRON = (window.location.port === ""); // No HREF PORT when run by Electron
if (IS_ELECTRON) {
  APP_ID = 'main-app'
  let searchParams = new URLSearchParams(window.location.search);
  HC_PORT = searchParams.get("PORT");
  NETWORK_ID = searchParams.get("UID");
  console.log(NETWORK_ID)
}

// FIXME
//const HC_PORT = process.env.HC_PORT
//const HC_PORT = 8889
console.log("HC_PORT = " + HC_PORT + " || " + process.env.HC_PORT);


export class PlaceApp extends ScopedElementsMixin(LitElement) {

  @state() loaded = false;

  _placeStore: PlaceStore | null = null;

  _placeCellId: CellId | null = null;


  /** */
  async firstUpdated() {
    const wsUrl = `ws://localhost:${HC_PORT}`
    const installed_app_id = NETWORK_ID == null || NETWORK_ID == ''
      ? APP_ID
      : APP_ID + '-' + NETWORK_ID;
    console.log({installed_app_id})

    const hcClient = await HolochainClient.connect(wsUrl, installed_app_id);
    console.log({hcClient})
    /** Place */
    let place_cell = hcClient.cellDataByRoleId("place");
    if (!place_cell) {
      alert("Place Cell not found in happ")
    }
    this._placeCellId = place_cell!.cell_id;
    const placeClient = hcClient.forCell(place_cell!);
    console.log({placeClient})

    /** Send dnaHash to electron */
    if (IS_ELECTRON) {
      const ipc = window.require('electron').ipcRenderer;
      const dnaHashB64 = serializeHash(placeClient.cellId[0])
      let _reply = ipc.sendSync('dnaHash', dnaHashB64);
    }


    this._placeStore = new PlaceStore(hcClient);
    new ContextProvider(this, placeContext, this._placeStore);

    this.loaded = true;
  }


  render() {
    console.log("place-app render() called!")
    if (!this.loaded) {
      return html`<span>Loading...</span>`;
    }
    return html`
       <place-controller style="height:100vh"></place-controller>
    `;
  }


  static get scopedElements() {
    return {
      "place-controller": PlaceController,
    };
  }
}
