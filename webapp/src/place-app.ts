import { html } from "lit";
import { state, property } from "lit/decorators.js";
import {AdminWebsocket, Cell, CellId, DnaHash, encodeHashToBase64} from "@holochain/client";

import {
  PlacePage,
  DEFAULT_PLACE_DEF, PlaceDvm, PlaceDashboard, PlaceDashboardDvm, PlaceDashboardPerspective,
} from "@place/elements";
import {CellContext, CellsForRole, CloneId, HappElement, HCL, HvmDef} from "@ddd-qc/lit-happ";
import {PlaceProperties} from "@place/elements/dist/bindings/place.types";
import {Game} from "@place/elements/dist/bindings/place-dashboard.types";


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

  @state() private _curPlaceId: CloneId | null = null;

  @state() private _placeCells!: CellsForRole;

  static readonly HVM_DEF: HvmDef = DEFAULT_PLACE_DEF;

  // @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  // dashboardPerspective!: PlaceDashboardPerspective;

  constructor() {
    super(HC_APP_PORT);
  }


  /** -- Getters -- */

  get placeDashboardDvm(): PlaceDashboardDvm { return this.hvm.getDvm(PlaceDashboardDvm.DEFAULT_BASE_ROLE_NAME)! as PlaceDashboardDvm }
  //get placeDvm(): PlaceDvm { return this.hvm.getDvm(PlaceDvm.DEFAULT_BASE_ROLE_NAME)! as PlaceDvm }


  get curPlaceDvm(): PlaceDvm {
    const hcl = new HCL(this.hvm.appId, PlaceDvm.DEFAULT_BASE_ROLE_NAME, this._curPlaceId);
    const maybeDvm = this.hvm.getDvm(hcl);
    if (!maybeDvm) console.error("DVM not found for Place " + hcl.toString(), this.hvm);
    return maybeDvm! as PlaceDvm;
  }

  /** -- Methods -- */

  /** */
  async happInitialized() {
    console.log("happInitialized()")
    //new ContextProvider(this, cellContext, this.taskerDvm.installedCell);
    //this._curPlaceCellId = this.placeDvm.cell.cell_id;
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
      const dnaHashB64 = encodeHashToBase64(this.curPlaceDvm.cell.cell_id[0])
      let _reply = ipc.sendSync('dnaHash', dnaHashB64);
    }

    /** Grab place cells */
    this._placeCells = await this.conductorAppProxy.fetchCells(DEFAULT_PLACE_DEF.id, PlaceDvm.DEFAULT_BASE_ROLE_NAME);

    /** Done */
    this._loaded = true;
  }


  /** */
  async onAddClone(cloneName: string, settings: PlaceProperties) {
    console.log("onAddClone()", cloneName);
    const cellDef = { modifiers: {properties: settings, origin_time: settings.startTime}, cloneName}
    const [_cloneIndex, dvm] = await this.hvm.cloneDvm(PlaceDvm.DEFAULT_BASE_ROLE_NAME, cellDef);
    this._placeCells = await this.conductorAppProxy.fetchCells(this.hvm.appId, PlaceDvm.DEFAULT_BASE_ROLE_NAME);
    //this._curPlaceId = dvm.cell.clone_id;
    console.log("Place clone created:", dvm.hcl.toString(), dvm.cell.name, dvm.cell.clone_id);
    /** Create Game Entry */
    const game: Game = {name: cloneName, dna_hash: dvm.cell.cell_id[0], settings}
    await this.placeDashboardDvm.zvm.createGame(game);
  }

  async onSelectClone(dnaHash: DnaHash) {
    const cloneB64 = encodeHashToBase64(dnaHash);
    console.log("onSelectClone()", cloneB64);
    /** Look for clone with this dnaHash */
    for (const clone of Object.values(this._placeCells.clones)) {
      if (encodeHashToBase64(clone.cell_id[0]) == cloneB64) {
        this._curPlaceId = clone.clone_id;
        break;
      }
    }
  }


  /** */
  render() {
    console.log("<place-app>.render()")
    if (!this._loaded) {
      return html`<span>Loading...</span>`;
    }

    /** Render Current Place */
    if (this._curPlaceId) {
      return html`
       <cell-context .cell="${this.curPlaceDvm.cell}">
         <place-page style="height:100vh"
                     @exit="${(e:any) => {e.stopPropagation(); this._curPlaceId = null}}"
         ></place-page>
       </cell-context>
    `;
    }

    /** Render Dashboard */
    return html`
       <cell-context .cell="${this.placeDashboardDvm.cell}">
         <place-dashboard style="height:100vh"
                          @create-new-game="${(e:any) => {e.stopPropagation(); this.onAddClone(e.detail.name, e.detail.settings)}}"
                          @clone-selected="${(e:any) => {e.stopPropagation(); this.onSelectClone(e.detail)}}"
         ></place-dashboard>
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
