import {
  AppAgentWebsocket,
  } from "@holochain/client";

import {
  RenderInfo,
  WeServices,
} from "@lightningrodlabs/we-applet";

import "@lightningrodlabs/we-applet/dist/elements/we-client-context.js";
import "@lightningrodlabs/we-applet/dist/elements/hrl-link.js";

import {PlaceApp} from "place";
import {AppletViewInfo} from "@ddd-qc/we-utils";


/** */
export async function createPlaceApplet(
    renderInfo: RenderInfo,
    weServices: WeServices,
): Promise<PlaceApp> {

  if (renderInfo.type =="cross-applet-view") {
    throw Error("cross-applet-view not implemented by Files");
  }

  const appletViewInfo = renderInfo as AppletViewInfo;
  const mainAppInfo = await appletViewInfo.appletClient.appInfo();

  const mainAppAgentWs = appletViewInfo.appletClient as AppAgentWebsocket;
  const mainAppWs = mainAppAgentWs.appWebsocket;

  /** Create PlaceApp */
  const app = await PlaceApp.fromWe(
    mainAppWs, undefined, false, mainAppInfo.installed_app_id,
    weServices, appletViewInfo.appletHash);

  /** Done */
  return app;
}
