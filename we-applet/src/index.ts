import {AppletServices} from "@lightningrodlabs/we-applet";
import {DevTestNames, setup} from "@ddd-qc/we-utils";
import {createPlaceApplet} from "./createPlaceApplet";


/** */
async function setupPlaceApplet() {

  const filesNames: DevTestNames = {
    installed_app_id: "place-we_applet",
    provisionedRoleName: "rPlaceDashboard",
  }

  const appletServices: AppletServices = {
    attachmentTypes: async (_appletClient) => ({}),
    getEntryInfo: () => (undefined),
    blockTypes: {},
    search: async (appletClient, searchFilter) => {return []},
  };

  return setup(appletServices, createPlaceApplet, filesNames);
}


export default setupPlaceApplet;
