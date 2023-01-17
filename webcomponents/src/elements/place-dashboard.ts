import {css, html} from "lit";
import {property, state} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {PlaceDashboardPerspective} from "../viewModel/place-dashboard.perspective";
import {PlaceDashboardZvm} from "../viewModel/place-dashboard.zvm";
import {SlBadge, SlTooltip} from "@scoped-elements/shoelace";
import {Game, PlaceProperties} from "../bindings/place-dashboard.types";
import {DnaHash, encodeHashToBase64} from "@holochain/client";


/**
 * @element place-page
 */
export class PlaceDashboard extends ZomeElement<PlaceDashboardPerspective, PlaceDashboardZvm> {
  constructor() {
    super(PlaceDashboardZvm.DEFAULT_ZOME_NAME)
  }

  /** -- Fields -- */
  @state() private _initialized = false;


  /** -- Methods -- */

  /** */
  openGame(dnaHash: DnaHash) {
    console.log("openGame()", encodeHashToBase64(dnaHash))
    this.dispatchEvent(new CustomEvent('clone-selected', {detail: dnaHash, bubbles: true, composed: true}));
  }


  /** */
  onCreateGame(e: any) {
    console.log("onCreateGame()");
    const nameInput = this.shadowRoot!.getElementById("createNameInput") as HTMLInputElement;
    const name = nameInput.value;
    nameInput.value = "";
    const settings: PlaceProperties = {
      startTime: Math.ceil(Date.now() / 1000),
      canvasSize: Number((this.shadowRoot!.getElementById("createcanvasSizeInput") as HTMLInputElement).value),
      bucketSizeSec: Number((this.shadowRoot!.getElementById("createbucketSizeInput") as HTMLInputElement).value),
      pixelsPerBucket: Number((this.shadowRoot!.getElementById("createPpbInput") as HTMLInputElement).value),
      snapshotIntervalInBuckets: Number((this.shadowRoot!.getElementById("createIntervalInput") as HTMLInputElement).value),
    };
    this.dispatchEvent(new CustomEvent('create-new-game', {detail: {name, settings}, bubbles: true, composed: true}));
  }


  /** */
  render() {
    const gamesCount = Object.values(this._zvm.perspective.allGames).length;
    console.log("<place-dashboard> render()", this._initialized, gamesCount);

    /* Elements */
    const allGamesLi = Object.values(this.perspective.allGames).map(
      ([author, joined, game]) => {
        return html `<li>
          <h3><abbr title="${encodeHashToBase64(game.dna_hash)}">${game.name}</abbr></h3>
          <button @click=${() => {this.openGame(game.dna_hash)}}>open</button>
          <div>joined: ${joined}</div>
          <details>
            <summary>Settings</summary>
            <div>Created by: ${author}</div>
            ${JSON.stringify(game.settings)}
          </details>
        </li>`;
      }
    )
    /** render all */
    return html`
      <div>
        <h1>Dashboard</h1>
        <h2>Available games (${gamesCount})</h2>
        <ul id="gamesList">${allGamesLi}</ul>
      </div>
      <!-- Create new Place Game -->
      <h2>Create New Game</h2>
      <form>
        <label for="createNameInput">Name:</label><input id="createNameInput" type="text" name="name">
        <label for="createcanvasSizeInput">canvasSize:</label><input id="createcanvasSizeInput" type="number" value="10" name="canvasSize">
        <label for="createbucketSizeInput">bucketSizeSec:</label><input id="createbucketSizeInput" type="number" value="60" name="bucketSizeSec">
        <label for="createPpbInput">pixelsPerBucket:</label><input id="createPpbInput" type="number" value="10" name="pixelsPerBucket">
        <label for="createIntervalInput">snapshotIntervalInBuckets:</label><input id="createIntervalInput" value="2" type="number" name="snapshotIntervalInBuckets">

        <div>
          <input type="button" value="create" @click=${this.onCreateGame}>
        </div>
      </form>
    `;
  }

  /** */
  static get scopedElements() {
    return {
      'sl-tooltip': SlTooltip,
      'sl-badge': SlBadge,
    };
  }

  static get styles() {
    return []
  }
}
