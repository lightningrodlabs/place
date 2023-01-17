import { html } from "lit";
import { state } from "lit/decorators.js";
import {AdminWebsocket, CellId, encodeHashToBase64} from "@holochain/client";

import {
  PlacePage,
  DEFAULT_PLACE_DEF, PlaceDvm, PlaceDashboard, PlaceDashboardDvm,
} from "@place/elements";
import {CellContext, HappElement, HvmDef} from "@ddd-qc/lit-happ";


let HC_APP_PORT: number;
let HC_ADMIN_PORT: number;
export const IS_ELECTRON = (window.location.port === ""); // No HREF PORT when run by Electron
if (IS_ELECTRON) {
  const APP_ID = 'main-app'
  const searchParams = new URLSearchParams(window.location.search);
  const urlPort = searchParams.get("APP");
  if(!urlPort) {
    console.error("Missing APP value in URL", window.location.search)
  }
  HC_APP_PORT = Number(urlPort);
  const urlAdminPort = searchParams.get("ADMIN");
  HC_ADMIN_PORT = Number(urlAdminPort);
  const NETWORK_ID = searchParams.get("UID");
  console.log(NETWORK_ID);
  DEFAULT_PLACE_DEF.id = APP_ID + '-' + NETWORK_ID;  // override installed_app_id
} else {
  HC_APP_PORT = Number(process.env.HC_APP_PORT);
  HC_ADMIN_PORT = Number(process.env.HC_ADMIN_PORT);
}

console.log("APP_ID =", DEFAULT_PLACE_DEF.id)
console.log("HC_APP_PORT", HC_APP_PORT);
console.log("HC_ADMIN_PORT", HC_ADMIN_PORT);


/** */
export class PlaceApp extends HappElement {

  @state() private _loaded = false;

  _placeCellId: CellId | null = null;

  static readonly HVM_DEF: HvmDef = DEFAULT_PLACE_DEF;

  constructor() {
    super(HC_APP_PORT);
  }


  get placeDashboardDvm(): PlaceDashboardDvm { return this.hvm.getDvm(PlaceDashboardDvm.DEFAULT_BASE_ROLE_NAME)! as PlaceDashboardDvm }
  get placeDvm(): PlaceDvm { return this.hvm.getDvm(PlaceDvm.DEFAULT_BASE_ROLE_NAME)! as PlaceDvm }


  /** */
  async happInitialized() {
    console.log("happInitialized()")
    //new ContextProvider(this, cellContext, this.taskerDvm.installedCell);
    this._placeCellId = this.placeDvm.cell.cell_id;
    /** Authorize all zome calls */
    const adminWs = await AdminWebsocket.connect(`ws://localhost:${HC_ADMIN_PORT}`);
    //console.log({ adminWs });
    await this.hvm.authorizeAllZomeCalls(adminWs);
    console.log("*** Zome call authorization complete");
    /** Probe */
    await this.hvm.probeAll();
    /** Send dnaHash to electron */
    if (IS_ELECTRON) {
      const ipc = window.require('electron').ipcRenderer;
      const dnaHashB64 = encodeHashToBase64(this._placeCellId![0])
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
       <cell-context .cell="${this.placeDashboardDvm.cell}">
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
