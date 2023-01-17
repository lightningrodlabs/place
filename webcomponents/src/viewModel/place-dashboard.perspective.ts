// TODO: add globally available interfaces for your elements

import {Game} from "../bindings/place-dashboard.types";
import {AgentPubKeyB64} from "@holochain/client";
import {Dictionary} from "@ddd-qc/cell-proxy";


export interface PlaceDashboardPerspective {
  allGames: Dictionary<[AgentPubKeyB64, boolean, Game]>,
  // myGames: [AgentPubKey, Game][],
}


export function defaultDashboardPerspective(): PlaceDashboardPerspective {
  return {
    allGames: {},
    //myGames: [],
  }
}



