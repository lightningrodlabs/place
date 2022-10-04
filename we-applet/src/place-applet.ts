import { ContextProvider } from "@lit-labs/context";
import { property, state } from "lit/decorators.js";
// import {
//   ProfilesStore,
//   profilesStoreContext,
// } from "@holochain-open-dev/profiles";
import { InstalledAppInfo, AppWebsocket } from "@holochain/client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html } from "lit";
import {
  PlaceController,
  PlaceStore,
  placeContext,
} from "@place/elements";
//import { sharedStyles } from "@place/elements";
import { InstalledAppletInfo } from "@lightningrodlabs/we-applet";
import {HolochainClient} from "@holochain-open-dev/cell-client";

export class PlaceApplet extends ScopedElementsMixin(LitElement) {
  @property()
  appWebsocket!: AppWebsocket;

  // @property()
  // profilesStore!: ProfilesStore;

  @property()
  appletAppInfo!: InstalledAppletInfo[];

  @state()
  loaded = false;

  async firstUpdated() {
    //new ContextProvider(this, profilesStoreContext, this.profilesStore);

    console.log({appWebsocket: this.appWebsocket})
    console.log({appletAppInfo: this.appletAppInfo})

    /** Place */
    const hcClient = new HolochainClient(this.appWebsocket)
    const placeStore = new PlaceStore(hcClient, this.appletAppInfo[0].installedAppInfo.cell_data[0].cell_id);
    new ContextProvider(this, placeContext, placeStore);

    this.loaded = true;
  }

  render() {
    console.log("place-applet render() called!")
    if (!this.loaded) {
      return html`<span>Loading...</span>`;
    }

    return html`
    <place-controller style="height:100vh"></place-controller>
    `;

    // return html`
    // <div class="flex-scrollable-parent">
    //   <div class="flex-scrollable-container">
    //     <div class="flex-scrollable-y">
    //       <place-controller style="padding: 30px"></place-controller>
    //     </div>
    //   </div>
    // </div>`;
  }

  static get scopedElements() {
    return {
      "place-controller": PlaceController,
    };
  }

  // static get styles() {
  //   return sharedStyles;
  // }
}
