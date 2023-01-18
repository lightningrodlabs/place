import {css, html} from "lit";
import {property, state} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {PlaceDashboardPerspective} from "../viewModel/place-dashboard.perspective";
import {PlaceDashboardZvm} from "../viewModel/place-dashboard.zvm";
import {SlBadge, SlButton, SlCard, SlDetails, SlInput, SlSkeleton, SlTooltip} from "@scoped-elements/shoelace";
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
        return html `
          <sl-card class="card-game">
            <sl-skeleton class="square" slot="image"></sl-skeleton>
            <strong><abbr title="by ${author}">${game.name}</abbr></strong>
            ${joined
              ? html`<sl-badge variant="primary" pill>joined</sl-badge>`
              : html`<sl-badge variant="neutral" pill>unjoined</sl-badge>`
            }
            <small>${encodeHashToBase64(game.dna_hash)}</small>
              <sl-details summary="Parameters">
                <div>startTime: ${game.settings.startTime}</div>
                <div>canvasSize: ${game.settings.canvasSize}</div>
                <div>bucketSizeSec: ${game.settings.bucketSizeSec}</div>
                <div>pixelsPerBucket: ${game.settings.pixelsPerBucket}</div>
                <div>snapshotInterval: ${game.settings.snapshotIntervalInBuckets}</div>
              </sl-details>
            <div slot="footer">
              <sl-button variant="primary" @click=${() => {this.openGame(game.dna_hash)}}>open</sl-button>
            </div>
          </sl-card>`;
      }
    )

    /** render all */
    return html`
      <h1>
        <img src="logo.svg" width="32" height="32" style="padding-left: 5px;padding-top: 5px;"/>
        Place
      </h1>
      <div>
        <h2>Available games (${gamesCount})</h2>
        <div>
            ${allGamesLi}
        </div>
      </div>
      <!-- Create new Place Game -->
      <sl-card>
        <h3 style="margin-top:0px;" slot="header">Create New Game</h3>
        <sl-input label="Name:" id="createNameInput" clearable type="text"></sl-input>
        <sl-input label="Canvas size:" id="createcanvasSizeInput" type="number" value="10"></sl-input>
        <sl-input label="Timeframe duration:" id="createbucketSizeInput" type="number" value="60"></sl-input>
        <sl-input label="Pixels per timeframe:" id="createPpbInput" type="number" value="10"></sl-input>
        <sl-input label="Snapshot interval (in timeframes):" id="createIntervalInput" value="2" type="number"></sl-input>

          <sl-button variant="primary" @click=${this.onCreateGame}>
            create
          </sl-button>

      </sl-card>
    `;
  }

  /** */
  static get scopedElements() {
    return {
      'sl-card': SlCard,
      'sl-tooltip': SlTooltip,
      'sl-badge': SlBadge,
      'sl-button': SlButton,
      'sl-input': SlInput,
      'sl-details': SlDetails,
      'sl-skeleton': SlSkeleton,
    };
  }

  static get styles() {
    return [css`
      .card-game {
        max-width: 300px;
        min-width: 300px;
        overflow: clip;
        background: red;
      }

      .card-game small {
        color: var(--sl-color-neutral-500);
      }

      .card-game [slot='image'] {
        height: 170px;
      }

      .card-game [slot='footer'] {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: green;
      }

      .square::part(indicator) {
        --border-radius: var(--sl-border-radius-medium);
      }
    `]
  }
}
