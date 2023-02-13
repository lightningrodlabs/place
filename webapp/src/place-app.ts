import { html } from "lit";
import { state, property } from "lit/decorators.js";
import {
  AdminWebsocket,
  AppWebsocket,
  ClonedCell,
  DnaHashB64,
  encodeHashToBase64,
  InstalledAppId
} from "@holochain/client";

import {
  PlacePage,
  DEFAULT_PLACE_DEF, PlaceDvm, PlaceDashboard, PlaceDashboardDvm,
} from "@place/elements";
import {
  CellContext,
  CellsForRole,
  CloneId,
  Dictionary,
  HappElement,
  HCL,
  HvmDef,
  printCellsForRole
} from "@ddd-qc/lit-happ";
import {PlaceProperties, Snapshot} from "@place/elements/dist/bindings/place.types";
import {Game} from "@place/elements/dist/bindings/place-dashboard.types";
import {CellId} from "@holochain/client/lib/types";

let HC_APP_PORT: number;
let HC_ADMIN_PORT: number;
export const MY_ELECTRON_API = 'electronBridge' in window? window.electronBridge as Object : undefined;
export const IS_ELECTRON = typeof MY_ELECTRON_API !== 'undefined'
if (IS_ELECTRON) {
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
  DEFAULT_PLACE_DEF.id = "electron-place" + '-' + NETWORK_ID;  // override installed_app_id
} else {
  try {
    HC_APP_PORT = Number(process.env.HC_APP_PORT);
    HC_ADMIN_PORT = Number(process.env.HC_ADMIN_PORT);
  } catch (e) {
    console.log("process.env not defined")
  }
}

console.log("DEFAULT_PLACE_DEF.id =", DEFAULT_PLACE_DEF.id)
console.log("HC_APP_PORT", HC_APP_PORT);
console.log("HC_ADMIN_PORT", HC_ADMIN_PORT);
console.log("IS_ELECTRON", IS_ELECTRON);


/**
 *
 */
export class PlaceApp extends HappElement {

  /** */
  constructor(appWs?: AppWebsocket, private _adminWs?: AdminWebsocket, appId?: InstalledAppId) {
    console.log("PlaceApp", appId)
    super(appWs? appWs : HC_APP_PORT? HC_APP_PORT : 0, appId);
  }

  static readonly HVM_DEF: HvmDef = DEFAULT_PLACE_DEF;

  @state() private _loaded = false;
  @state() private _curPlaceCloneId: CloneId | null = null;
  @state() private _placeCells!: CellsForRole;
  /** DnaHashB64 -> Snapshot */
  @state() private _latestSnapshots: Dictionary<Snapshot> = {};

  /** DnaHashB64 -> CloneId */
  private _clones: Dictionary<CloneId> = {}


  /** -- Getters -- */

  get placeDashboardDvm(): PlaceDashboardDvm { return this.hvm.getDvm(PlaceDashboardDvm.DEFAULT_BASE_ROLE_NAME)! as PlaceDashboardDvm }
  //get placeDvm(): PlaceDvm { return this.hvm.getDvm(PlaceDvm.DEFAULT_BASE_ROLE_NAME)! as PlaceDvm }

  get curPlaceDvm(): PlaceDvm {
    return this.getPlaceDvm(this._curPlaceCloneId == null? undefined: this._curPlaceCloneId);
  }

  getPlaceDvm(cloneId?: CloneId): PlaceDvm | null {
    const hcl = new HCL(this.hvm.appId, PlaceDvm.DEFAULT_BASE_ROLE_NAME, cloneId);
    const maybeDvm = this.hvm.getDvm(hcl);
    if (!maybeDvm) {
      console.error("DVM not found for Place " + hcl.toString(), this.hvm);
      return null;
    }
    return maybeDvm as PlaceDvm;
  }


  /** -- Methods -- */


  /** */
  async happInitialized() {
    console.log("happInitialized()", HC_ADMIN_PORT, HC_APP_PORT, this.hvm.appId);

    /** Check AdminWs */
    if (!this._adminWs) {
      this._adminWs = await AdminWebsocket.connect(`ws://localhost:${HC_ADMIN_PORT}`);
      //if (this._adminWs) {
      //  const apps = await this._adminWs.listApps({});
      //  console.log("Installed apps:", apps);
      //}
    }

    /** Send dnaHash to electron */
    if (IS_ELECTRON) {
      //const ipc = window.require('electron').ipcRenderer;
      let _reply = (MY_ELECTRON_API as any).sendSync('dnaHash', this.curPlaceDvm.cell.dnaHash);
    }

    /** Grab Place cells */
    this._placeCells = await this.conductorAppProxy.fetchCells(this.hvm.appId, PlaceDvm.DEFAULT_BASE_ROLE_NAME);
    console.log("this._placeCells", printCellsForRole(PlaceDvm.DEFAULT_BASE_ROLE_NAME, this._placeCells));
    for (const [cloneId, cell] of Object.entries(this._placeCells.clones)) {
      this._clones[encodeHashToBase64(cell.cell_id[0])] = cloneId;
      try {
        await this.enableClone(cloneId);
      } catch(e) {
        console.warn("EnableClone failed for " + cloneId, e);
      }
    }
    console.log("this._clones", this._clones);


    /** Authorize all zome calls */
    if (this._adminWs) {
      await this.hvm.authorizeAllZomeCalls(this._adminWs);
      console.log("*** Zome call authorization complete");
    } else {
      console.warn("No adminWebsocket provided (Zome call authorization must already be done)")
    }

    /** Probe */
    await this.hvm.probeAll();


    /** Disable all clones */
    for (const [cloneId, cell] of Object.entries(this._placeCells.clones)) {
      await this.disableClone(cloneId);
    }


    /** Done */
    this._loaded = true;
  }


  /** */
  async onAddClone(cloneName: string, settings: PlaceProperties): Promise<PlaceDvm> {
    console.log("onAddClone()", cloneName, this.hvm.appId);
    const cellDef = { modifiers: {properties: settings, origin_time: settings.startTime}, cloneName}
    const [clonedCell, dvm] = await this.hvm.cloneDvm(PlaceDvm.DEFAULT_BASE_ROLE_NAME, cellDef);
    const cloneId = clonedCell.clone_id;
    this._clones[dvm.cell.dnaHash] = cloneId;
    this._placeCells = await this.conductorAppProxy.fetchCells(this.hvm.appId, PlaceDvm.DEFAULT_BASE_ROLE_NAME);
    //this._curPlaceId = dvm.cell.clone_id;
    console.log("Place clone created:", dvm.hcl.toString(), dvm.cell.name, dvm.cell.cloneId);
    /** Create Game Entry */
    const game: Game = {name: cloneName, dna_hash: dvm.cell.id[0], settings}
    await this.placeDashboardDvm.zvm.createGame(game);
    await this.disableClone(cloneId);
    return dvm as PlaceDvm;
  }


  /** */
  async onRefreshClone(game_or_dnaHash: Game | DnaHashB64) {
    console.log("onRefreshClone()", game_or_dnaHash);
    /** Get DVM for Clone */
    let cloneId = null;
    let dvm: PlaceDvm;
    let cloneDnaB64;
    if (typeof game_or_dnaHash === 'object') {
      const game: Game = game_or_dnaHash;
      cloneDnaB64 = encodeHashToBase64(game.dna_hash);
      /** Look for clone with this dnaHash */
      for (const clone of Object.values(this._placeCells.clones)) {
        if (encodeHashToBase64(clone.cell_id[0]) == cloneDnaB64) {
          cloneId = clone.clone_id;
          break;
        }
      }
      /** Create Clone if it doesn't exist */
      if (cloneId == null) {
        dvm = await this.onAddClone(game.name, game.settings);
      } else {
        dvm = this.getPlaceDvm(cloneId);
      }
    } else {
      cloneId = this._clones[game_or_dnaHash];
      cloneDnaB64 = game_or_dnaHash;
      dvm = this.getPlaceDvm(cloneId);
    }

    //console.log("onRefreshClone()", dvm);
    const snapshot = await dvm.placeZvm.getLatestSnapshot();
    console.log("onRefreshClone() snapshot", snapshot);
    this._latestSnapshots[cloneDnaB64] = snapshot;
    const dashboard = this.shadowRoot!.querySelectorAll('place-dashboard')[0] as PlaceDashboard;
    if (dashboard) {
      dashboard.requestUpdate();
    } else {
      this.requestUpdate();
    }
  }


  /** */
  async disableClone(cloneId: CloneId): Promise<void> {
    const request = {app_id: this.hvm.appId, clone_cell_id: cloneId};
    console.log("disableClone()", request);
    await this.conductorAppProxy.disableCloneCell(request);
  }


  /** */
  async enableClone(cloneId: CloneId | CellId): Promise<ClonedCell> {
    const request = {app_id: this.hvm.appId, clone_cell_id: cloneId};
    console.log("enableClone()", request);
    return this.conductorAppProxy.enableCloneCell(request);
  }


  /** */
  async onSelectClone(game: Game) {
    console.log("onSelectClone()", game.name);
    const cloneB64 = encodeHashToBase64(game.dna_hash);
    /** Look for clone with this dnaHash */
    for (const clone of Object.values(this._placeCells.clones)) {
      if (encodeHashToBase64(clone.cell_id[0]) == cloneB64) {
        const appInfo = await this.conductorAppProxy.appInfo({installed_app_id: this.hvm.appId});
        console.log({appInfo});
        //const cells = await this.conductorAppProxy.fetchCells(DEFAULT_PLACE_DEF.id, PlaceDvm.DEFAULT_BASE_ROLE_NAME);
        //console.log("cells", this.printCellsForRole("rPlace", cells));
        const _cloned = await this.enableClone(clone.clone_id);
        this._curPlaceCloneId = clone.clone_id;
        return;
      }
    }
    /** Cell not found, means cell is not installed or running */
    console.log("onSelectClone() Clone not found, adding it:", game.name);
    await this.onAddClone(game.name, game.settings);
  }


  /** */
  async onExitGame(cloneDnaHash: DnaHashB64) {
    await this.onRefreshClone(cloneDnaHash);
    await this.disableClone(this._clones[cloneDnaHash]);
    this._curPlaceCloneId = null;
  }


  /** */
  async onRefreshRequested(game: Game) {
    const dnaHash = encodeHashToBase64(game.dna_hash);
    const maybeClone = this._clones[dnaHash];
    if (!maybeClone) {
      console.warn("onRefreshRequested() aborted. Clone for game not found", game.name);
      return;
    }
    try {
      await this.enableClone(this._clones[dnaHash]);
      await this.onRefreshClone(game);
      await this.disableClone(this._clones[dnaHash]);
    } catch (e) {
      console.warn("onRefreshRequested() failed.", e);
    }
  }


  /** */
  render() {
    console.log("*** <place-app>.render()", this._loaded)
    if (!this._loaded) {
      return html`<span>Loading...</span>`;
    }

    /** Render Current Place */
    if (this._curPlaceCloneId) {
      return html`
       <cell-context .cell="${this.curPlaceDvm.cell}">
         <place-page style="height:100vh"
                     @exit="${(e:any) => {e.stopPropagation(); this.onExitGame(e.detail)}}"
         ></place-page>
       </cell-context>
    `;
    }

    /** Render Dashboard */
    return html`
       <cell-context .cell="${this.placeDashboardDvm.cell}">
         <place-dashboard style="height:100vh"
                          .latestSnapshots="${this._latestSnapshots}"
                          @create-new-game="${(e:any) => {e.stopPropagation(); this.onAddClone(e.detail.name, e.detail.settings)}}"
                          @clone-selected="${(e:any) => {e.stopPropagation(); this.onSelectClone(e.detail)}}"
                          @refresh-requested="${(e:any) => {e.stopPropagation(); this.onRefreshRequested(e.detail);}}"
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
