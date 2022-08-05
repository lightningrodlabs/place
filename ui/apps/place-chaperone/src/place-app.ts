import {ContextProvider} from "@holochain-open-dev/context";
import {AgentPubKeyB64, serializeHash} from '@holochain-open-dev/core-types';
import { state } from "lit/decorators.js";
import {
  PlaceController,
  PlaceStore,
  placeContext,
} from "@place/elements";
import {HolochainClient} from "@holochain-open-dev/cell-client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html } from "lit";
import {CellId} from "@holochain/client";

import { HoloClient, Branding } from "@holochain-open-dev/cell-client";
import { RoleId } from "@holochain/client";

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

    const branding: Branding = {
      app_name: "Place",
    };
    const client: HoloClient = await HoloClient.connect(
      'http://localhost:24274', // Connect to holo-dev-server
      //"https://devnet-chaperone.holo.host",
      "place",
      branding
    );

    /* Sign in at application startup */
    await client.signIn();

    /* Here you can use the WebSdk API, like: */
    //const connection = client.connection;
    //connection.on('agent-state', state => console.log(state));

    /** -- */
    this._placeStore = new PlaceStore(client);
    new ContextProvider(this, placeContext, this._placeStore);

    this.loaded = true;
  }


  render() {
    console.log("place-app render() called!")
    if (!this.loaded) {
      return html`<span>Loading...</span>`;
    }
    return html`
       <place-controller style="height:100vh"></place-controller>
    `;
  }


  static get scopedElements() {
    return {
      "place-controller": PlaceController,
    };
  }
}
