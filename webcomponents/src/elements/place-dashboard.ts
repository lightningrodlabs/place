import {css, html} from "lit";
import {property, state} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {PlaceDashboardPerspective} from "../viewModel/place-dashboard.perspective";
import {PlaceDashboardZvm} from "../viewModel/place-dashboard.zvm";
import {SlBadge, SlTooltip} from "@scoped-elements/shoelace";
import {Game} from "../bindings/place-dashboard.types";


/**
 * @element place-page
 */
export class PlaceDashboard extends ZomeElement<PlaceDashboardPerspective, PlaceDashboardZvm> {
  constructor() {
    super(PlaceDashboardZvm.DEFAULT_ZOME_NAME)
  }

  /** -- Fields -- */
  @state() private _initialized = false;


  /** */
  async onCreateGame(e: any) {
    console.log("onCreateGame()");
    const game: Game = {
      name: (this.shadowRoot!.getElementById("createNameInput") as HTMLInputElement).value,
      dna_hash: new Uint8Array(),
      settings: {
        startTime: Date.now(),
        canvasSize: Number((this.shadowRoot!.getElementById("createcanvasSizeInput") as HTMLInputElement).value),
        bucketSizeSec: Number((this.shadowRoot!.getElementById("createbucketSizeInput") as HTMLInputElement).value),
        pixelsPerBucket: Number((this.shadowRoot!.getElementById("createPpbInput") as HTMLInputElement).value),
        snapshotIntervalInBuckets: Number((this.shadowRoot!.getElementById("createIntervalInput") as HTMLInputElement).value),
      }
    }
    await this._zvm.createGame(game);
  }


  /** */
  render() {
    /* Elements */
    const allGamesLi = Object.values(this.perspective.allGames).map(
      ([author, joined, game]) => {
        return html `<li>
          <h3><abbr title="${game.dna_hash}">${game.name}</abbr></h3>
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
        <h2>Available games</h2>
        <ul id="gamesList">${allGamesLi}</ul>
      </div>
      <!-- NEW Membrane -->
      <h2>Create Game</h2>
      <form>
        <label for="createNameInput">Name:</label><input id="createNameInput" type="text" name="name">
        <label for="createcanvasSizeInput">canvasSize:</label><input id="createcanvasSizeInput" type="number" name="canvasSize">
        <label for="createbucketSizeInput">bucketSizeSec:</label><input id="createbucketSizeInput" type="number" name="bucketSizeSec">
        <label for="createPpbInput">pixelsPerBucket:</label><input id="createPpbInput" type="number" name="pixelsPerBucket">
        <label for="createIntervalInput">snapshotIntervalInBuckets:</label><input id="createIntervalInput" type="number" name="snapshotIntervalInBuckets">

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
