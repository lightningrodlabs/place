import {HvmDef} from "@ddd-qc/lit-happ";
import {PlaceDvm} from "./place.dvm";
import {PlaceDashboardDvm} from "./place-dashboard.dvm";

export const DEFAULT_PLACE_DEF: HvmDef = {
  id: "place",
  dvmDefs: [
    {ctor: PlaceDashboardDvm, isClonable: false},
    {ctor: PlaceDvm, isClonable: true},
  ],
}
