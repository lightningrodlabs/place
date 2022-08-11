import { LitElement, html } from "lit";
import { state } from "lit/decorators.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";

//@ts-ignore
import WebSdk from "@holo-host/web-sdk/src/index";


import {ContextProvider} from "@holochain-open-dev/context";
import {HoloClient} from "@holochain-open-dev/cell-client";
import {CellId} from "@holochain/client";

import {
  PlaceController,
  PlaceStore,
  placeContext,
} from "@place/elements";


let APP_ID = 'place'
let HC_PORT:any = process.env.HC_PORT;
let NETWORK_ID: any = null


// FIXME
//const HC_PORT = process.env.HC_PORT
//const HC_PORT = 8889
console.log("HC_PORT = " + HC_PORT + " || " + process.env.HC_PORT);


/** */
export class PlaceApp extends ScopedElementsMixin(LitElement) {

  @state() loaded = false;

  _placeStore: PlaceStore | null = null;

  _placeCellId: CellId | null = null;


  /** */
  async firstUpdated() {

    const url = 'http://localhost:24274' // Connect to holo-dev-server
    //const url = "https://devnet-chaperone.holo.host"

    console.log("WebSdk connecting to " + url)

    const client = await WebSdk.connect({
      chaperoneUrl: url,
      authFormCustomization: {
        //logoUrl: "my-logo.png",
        appName: "Place",
        requireRegistrationCode: false
      }
    });
    console.log({client})
    client.on('agent-state', (agent: any) => {
      console.log("HoloClient agent-state >> ", agent)
    })
    client.on('signal', (signal: any) => {
      console.log("HoloClient Signal >> ", signal)
    })

    // We just started up, so we're still connecting. Let's wait for isAvailable == true
    const sleep = (ms: any) => new Promise(resolve => setTimeout(resolve, ms))
    while (!client.agent.isAvailable) {
      await sleep(50)
      // In a real UI, we would register an event handler for `client.on('agent-state')`
      // and store the agent state in a reactive UI state so that our components can just branch on isAvailable.
    }
    console.log("Agent available! Anonymous:", client.agent.isAnonymous)

    /* Sign in at application startup */
    if (client.agent.isAnonymous) {
      await client.signIn();
    }
    console.log("client signedIn!")

    const appInfo = await client.appInfo();
    const holoClient = new HoloClient(client, appInfo);

    /** -- */
    this._placeStore = new PlaceStore(holoClient, appInfo.cell_data[0].cell_id);
    new ContextProvider(this, placeContext, this._placeStore);

    this.loaded = true;
  }


  /** */
  render() {
    console.log("place-app render() called!")
    if (!this.loaded) {
      return html`<span>Loading...</span>`;
    }
    return html`
       <place-controller style="height:100vh"></place-controller>
    `;
  }


  /** */
  static get scopedElements() {
    return {
      "place-controller": PlaceController,
    };
  }
}
