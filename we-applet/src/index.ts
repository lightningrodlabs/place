import {AppletHash, AppletServices, AssetInfo, RecordInfo, WAL, WeaveServices} from "@theweave/api";
import {createDefaultWeServicesMock, DevTestNames, setup} from "@ddd-qc/we-utils";
import {createPlaceApplet} from "./createPlaceApplet";
import {AppClient} from "@holochain/client";


/** */
async function setupPlaceApplet() {

  const filesNames: DevTestNames = {
    installed_app_id: "place-we_applet",
    provisionedRoleName: "rPlaceDashboard",
  }

  const appletServices: AppletServices = {
    creatables: {},
    getAssetInfo,
    blockTypes: {},
    search,
  };

  return setup(appletServices, createPlaceApplet, filesNames, createDefaultWeServicesMock);
}

export async function search(
  appletClient: AppClient,
  appletHash: AppletHash,
  weServices: WeaveServices,
  searchFilter: string,
): Promise<Array<WAL>> {
  return [];
}

/** */
export async function getAssetInfo(
  appletClient: AppClient,
  wal: WAL,
  recordInfo?: RecordInfo,
): Promise<AssetInfo | undefined> {
  return undefined;
}


export default setupPlaceApplet;
