import {HvmDef} from "@ddd-qc/lit-happ";
import {PlaceDvm} from "./place.dvm";

export const DEFAULT_PLACE_DEF: HvmDef = {
  id: "place",
  dvmDefs: [{ctor: PlaceDvm, isClonable: false}],
}
