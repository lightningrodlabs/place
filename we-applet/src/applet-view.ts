import {
  AppAgentClient,
  AppAgentWebsocket,
  EntryHash
} from "@holochain/client";
import {html, render} from "lit";

import {
  AppletViews,
  WeServices,
} from "@lightningrodlabs/we-applet";

import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
import "@lightningrodlabs/we-applet/dist/elements/we-services-context.js";
import "@lightningrodlabs/we-applet/dist/elements/hrl-link.js";

import {ProfilesClient} from "@holochain-open-dev/profiles";
import {PlaceApp} from "place";


/** */
export async function appletViews(
  client: AppAgentClient,
  thisAppletId: EntryHash,
  profilesClient: ProfilesClient,
  weServices: WeServices
): Promise<AppletViews> {

  const mainAppInfo = await client.appInfo();

  /** */
  const createPlaceApp = async () => {
    const mainAppAgentWs = client as AppAgentWebsocket;
    const mainAppWs = mainAppAgentWs.appWebsocket;
    /** Create PlaceApp */
    const app = await PlaceApp.fromWe(
      mainAppWs, undefined, false, mainAppInfo.installed_app_id,
      weServices, thisAppletId);
    /** Done */
    return app;
  }

  /** */
  return {
    main: async (hostElem) => {
      /** Link to styles */
      const cssLink = document.createElement('link');
      cssLink.href = "https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.4.0/dist/themes/light.css";
      cssLink.rel = "stylesheet";
      cssLink.media="(prefers-color-scheme:light)"
      /** Create and append <place-app> */
      const app = await createPlaceApp();
      /** Append Elements to host */
      hostElem.appendChild(cssLink);
      hostElem.appendChild(app);
    },

    blocks: {},
    entries: {},
  };
}
