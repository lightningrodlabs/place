import { DnaViewModel, ZvmDef } from "@ddd-qc/lit-happ";
import {AppSignalCb} from "@holochain/client";
import {PlaceDashboardZvm} from "./place-dashboard.zvm";


/**
 * TODO: Make a "passthrough" DVM generator in dna-client based on ZVM_DEFS
 */
export class PlaceDashboardDvm extends DnaViewModel {

  /** -- DnaViewModel Interface -- */

  static readonly DEFAULT_BASE_ROLE_NAME = "rPlaceDashboard";
  static readonly ZVM_DEFS: ZvmDef[] = [PlaceDashboardZvm];

  readonly signalHandler?: AppSignalCb;


  /** QoL Helpers */
  get zvm(): PlaceDashboardZvm {return this.getZomeViewModel(PlaceDashboardZvm.DEFAULT_ZOME_NAME) as PlaceDashboardZvm}


  /** -- ViewModel Interface -- */

  protected hasChanged(): boolean {return true}

  get perspective(): void {return}

}
