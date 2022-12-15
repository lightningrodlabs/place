import { DnaViewModel, ZvmDef } from "@ddd-qc/lit-happ";
import {AppSignalCb} from "@holochain/client";
import {PlaceZvm} from "./place.zvm";



/**
 * TODO: Make a "passthrough" DVM generator in dna-client based on ZVM_DEFS
 */
export class PlaceDvm extends DnaViewModel {

  /** -- DnaViewModel Interface -- */

  static readonly DEFAULT_BASE_ROLE_NAME = "rPlace";
  static readonly ZVM_DEFS: ZvmDef[] = [PlaceZvm];

  readonly signalHandler?: AppSignalCb;


  /** QoL Helpers */
  get placeZvm(): PlaceZvm {return this.getZomeViewModel(PlaceZvm.DEFAULT_ZOME_NAME) as PlaceZvm}


  /** -- ViewModel Interface -- */

  protected hasChanged(): boolean {return true}

  get perspective(): void {return}

}
