// TODO: add globally available interfaces for your elements

import {Game} from "../bindings/place-dashboard";
import {AgentPubKeyB64, Dictionary} from "@holochain-open-dev/core-types";



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



