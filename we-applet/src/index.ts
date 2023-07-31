import {
  AppAgentClient, EntryHash
} from "@holochain/client";

import {
  WeApplet,
} from "@lightningrodlabs/we-applet";

import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
import "@lightningrodlabs/we-applet/dist/elements/we-services-context.js";
import "@lightningrodlabs/we-applet/dist/elements/hrl-link.js";

import {appletViews} from "./applet-view";
import {crossAppletViews} from "./cross-applet-view";
import {HrlWithContext, WeServices} from "@lightningrodlabs/we-applet/dist/types";


/** */
const applet: WeApplet = {
  appletViews,
  crossAppletViews,
  attachmentTypes: async (appletClient: AppAgentClient, appletId: EntryHash, weServices: WeServices)=> {return {}},
  search: async (appletClient: AppAgentClient, appletId: EntryHash, weServices: WeServices, searchFilter: string) => {return []},
};


export default applet;
