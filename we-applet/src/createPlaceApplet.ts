import {
  AppWebsocket,
} from "@holochain/client";

import {
  RenderInfo,
  WeaveServices,
} from "@theweave/api";

//import "@theweave/api/dist/elements/we-client-context.js";
//import "@theweave/api/dist/elements/hrl-link.js";

import {PlaceApp} from "place";
import {AppletViewInfo} from "@ddd-qc/we-utils";


/** */
export async function createPlaceApplet(
    renderInfo: RenderInfo,
    weServices: WeaveServices,
): Promise<PlaceApp> {

  if (renderInfo.type =="cross-group-view") {
    throw Error("cross-group-view not implemented");
  }

  const appletViewInfo = renderInfo as AppletViewInfo;
  const mainAppInfo = await appletViewInfo.appletClient.appInfo();

  const mainAppWs = appletViewInfo.appletClient as AppWebsocket;

  /** Create PlaceApp */
  const app = await PlaceApp.fromWe(
    mainAppWs, undefined, false, mainAppInfo.installed_app_id,
    weServices, appletViewInfo.appletHash);

  /** Done */
  return app;
}
