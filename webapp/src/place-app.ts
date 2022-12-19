import { html } from "lit";
import { state } from "lit/decorators.js";
import {CellId} from "@holochain/client";
import {serializeHash} from '@holochain-open-dev/utils';

import {
  PlacePage,
  DEFAULT_PLACE_DEF, PlaceDvm,
} from "@place/elements";
import {CellContext, HappElement, HvmDef} from "@ddd-qc/lit-happ";
import {PlaceDashboard} from "@place/elements/dist/elements/place-dashboard";

//const APP_DEV = process.env.APP_DEV? process.env.APP_DEV : false;
let HC_APP_PORT: number = Number(process.env.HC_PORT);

export const IS_ELECTRON = (window.location.port === ""); // No HREF PORT when run by Electron
if (IS_ELECTRON) {
  const APP_ID = 'main-app'
  const searchParams = new URLSearchParams(window.location.search);
  const urlPort = searchParams.get("PORT");
  if(!urlPort) {
    console.error("Missing PORT value in URL", window.location.search)
  }
  HC_APP_PORT = Number(urlPort);
  const NETWORK_ID = searchParams.get("UID");
  console.log(NETWORK_ID);
  DEFAULT_PLACE_DEF.id = APP_ID + '-' + NETWORK_ID;  // override installed_app_id
}

console.log({APP_ID: DEFAULT_PLACE_DEF.id})
console.log({HC_APP_PORT})


/** */
export class PlaceApp extends HappElement {

  @state() private _loaded = false;

  _placeCellId: CellId | null = null;

  static readonly HVM_DEF: HvmDef = DEFAULT_PLACE_DEF;

  constructor() {
    super(HC_APP_PORT);
  }


  get placeDvm(): PlaceDvm { return this.hvm.getDvm(PlaceDvm.DEFAULT_BASE_ROLE_NAME)! as PlaceDvm }


  /** */
  async happInitialized() {
    console.log("happInitialized()")
    //new ContextProvider(this, cellContext, this.taskerDvm.installedCell);
    this._placeCellId = this.placeDvm.installedCell.cell_id;
    await this.hvm.probeAll();

    /** Send dnaHash to electron */
    if (IS_ELECTRON) {
      const ipc = window.require('electron').ipcRenderer;
      const dnaHashB64 = serializeHash(this._placeCellId![0])
      let _reply = ipc.sendSync('dnaHash', dnaHashB64);
    }

    /** Done */
    this._loaded = true;
  }


  /** */
  render() {
    console.log("<place-app>.render()")
    if (!this._loaded) {
      return html`<span>Loading...</span>`;
    }
    return html`
       <cell-context .installedCell="${this.placeDvm.installedCell}">
         <place-dashboard style="height:100vh"></place-dashboard>
       </cell-context>
    `;
  }


  static get scopedElements() {
    return {
      "place-page": PlacePage,
      "place-dashboard": PlaceDashboard,
      "cell-context": CellContext,
    };
  }
}
