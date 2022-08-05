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

import * as WebSdk from '@holo-host/web-sdk'

let APP_ID = 'place'
let HC_PORT:any = process.env.HC_PORT;
let NETWORK_ID: any = null


// FIXME
//const HC_PORT = process.env.HC_PORT
//const HC_PORT = 8889
console.log("HC_PORT = " + HC_PORT + " || " + process.env.HC_PORT);


export class PlaceApp extends ScopedElementsMixin(LitElement) {

  @state() loaded = false;

  _placeStore: PlaceStore | null = null;

  _placeCellId: CellId | null = null;


  /** */
  async firstUpdated() {

    const hcClient = await WebSdk.connect({
      chaperoneUrl: 'http://localhost:24274', // Connect to holo-dev-server
      // chaperoneUrl: 'https://chaperone.holo.host'

      /* Customize the Credentials Overlay */
      authFormCustomization: {
        //logoUrl: "my-logo.png",
        appName: "Place",
        requireRegistrationCode: false
      }
    })

    /* Check what kind of agent we have */
    console.log(hcClient.agent)

    /* We just started up, so we're still connecting. Let's wait for isAvailable == true */
    const sleep = (ms: number | undefined) => new Promise(resolve => setTimeout(resolve, ms))
    while (!hcClient.agent.isAvailable) {
      await sleep(50)
      /* In a real UI, we would register an event handler for `hcClient.on('agent-state')`
       * and store the agent state in a reactive UI state so that our components can just branch on isAvailable.
       */
    }

    /* Check what kind of agent we have */
    console.log(hcClient.agent)

    /* WebSdk defaults to an anonymous connection where you can't write to the source chain. Sign in so we can commit something */
    await hcClient.signIn()

    /* The credentials overlay is now visible to the user. Wait for them to sign in */
    while (hcClient.agent.isAnonymous || !hcClient.agent.isAvailable) {
      await sleep(50)
      /* Again, this while/sleep pattern is for demo only. See comment above about doing this using an event handler */
    }
    console.log(hcClient.agent)


    /** -- */

    // const wsUrl = `ws://localhost:${HC_PORT}`
    // const installed_app_id = NETWORK_ID == null || NETWORK_ID == ''
    //   ? APP_ID
    //   : APP_ID + '-' + NETWORK_ID;
    // console.log({installed_app_id})
    //
    // const hcClient = await HolochainClient.connect(wsUrl, installed_app_id);
    // console.log({hcClient})
    // /** Place */
    // let place_cell = hcClient.cellDataByRoleId("place");
    // if (!place_cell) {
    //   alert("Place Cell not found in happ")
    // }
    // this._placeCellId = place_cell!.cell_id;
    // const placeClient = hcClient.forCell(place_cell!);
    // console.log({placeClient})

    let anyClient = {
        agentPubKey: hcClient.agent.id,
        roleId: "place",
        zomeName: "place",
        zomeCall: hcClient.zomeCall
    };

    this._placeStore = new PlaceStore(anyClient);
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
