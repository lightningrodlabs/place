import {css, html} from "lit";
import {property, state} from "lit/decorators.js";
import {Dictionary, ZomeElement} from "@ddd-qc/lit-happ";
import {PlaceDashboardPerspective} from "../viewModel/place-dashboard.perspective";
import {PlaceDashboardZvm} from "../viewModel/place-dashboard.zvm";
import {SlBadge, SlButton, SlCard, SlDetails, SlInput, SlSkeleton, SlTooltip} from "@scoped-elements/shoelace";
import {Game, PlaceProperties, Snapshot} from "../bindings/place-dashboard.types";
import {DnaHash, encodeHashToBase64} from "@holochain/client";
import {snapshotIntoFrame} from "../imageBuffer";
import {determineBucketTime, validateSettings} from "../time";
import {MAX_BUCKET_SIZE_SEC, MIN_BUCKET_SIZE_SEC} from "../bindings/place.types";


/**
 * @element place-page
 */
export class PlaceDashboard extends ZomeElement<PlaceDashboardPerspective, PlaceDashboardZvm> {
  constructor() {
    super(PlaceDashboardZvm.DEFAULT_ZOME_NAME)
  }

  /** -- Fields -- */
  @state() private _initialized = false;


  @property({type: Object})
  latestSnapshots: Dictionary<Snapshot> = {};

  /** -- Methods -- */

  /** */
  openGame(game: Game) {
    console.log("openGame()", game.name)
    this.dispatchEvent(new CustomEvent('clone-selected', {detail: game, bubbles: true, composed: true}));
  }


  /** */
  refreshGame(game: Game) {
    console.log("refreshGame()", game.name)
    this.dispatchEvent(new CustomEvent('refresh-requested', {detail: game, bubbles: true, composed: true}));
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
    /** Validate settings */
    const helper = this.shadowRoot!.getElementById("createHelper") as HTMLSpanElement;
    try {
      if (name.length < 2) throw Error("Name too short");
      validateSettings(settings);
    } catch (e:any) {
      console.log({e})
      helper.style.display = "block";
      helper.innerHTML = e.message;
      return;
    }
    /** All good */
    helper.style.display = "none";
    this.dispatchEvent(new CustomEvent('create-new-game', {detail: {name, settings}, bubbles: true, composed: true}));
  }


  async updated() {
    /** Fill in canvases */
    for (const [author, joined, game] of Object.values(this.perspective.allGames)) {
      const maybeSnapshot = this.latestSnapshots[encodeHashToBase64(game.dna_hash)];
      if (!maybeSnapshot || !joined) {
        continue;
      }
      const canvasId = "canvas-" + encodeHashToBase64(game.dna_hash);
      const canvas = this.shadowRoot!.getElementById(canvasId) as HTMLCanvasElement;
      if (!canvas) {
        console.warn("canvasId not found", canvasId)
        continue;
      }
      const snapshotFrame = snapshotIntoFrame(maybeSnapshot.imageData, game.settings.canvasSize)
      console.log("" + maybeSnapshot.timeBucketIndex + ".snapshotFrame", snapshotFrame)

      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const imgData = ctx.createImageData(game.settings.canvasSize, game.settings.canvasSize);
      for (let i = 0; i < snapshotFrame.length; i += 1) {
        imgData.data[i] = snapshotFrame[i];
      }
      // Test - red square
      // for (let i = 0; i < imgData.data.length; i += 4) {
      //   imgData.data[i+0] = 255;
      //   imgData.data[i+1] = 0;
      //   imgData.data[i+2] = 0;
      //   imgData.data[i+3] = 255;
      // }
      const bmp = await createImageBitmap(imgData);
      const scale = 150 / game.settings.canvasSize;
      ctx.scale(scale, scale);
      ctx.drawImage(bmp, 0, 0);

      console.log("" + scale + " | ImageData of " + game.name, imgData)
    }
  }


  /** */
  render() {
    const gamesCount = Object.values(this._zvm.perspective.allGames).length;
    console.log("<place-dashboard> render()", this._initialized, gamesCount);

    /* Elements */
    const allGamesLi = Object.values(this.perspective.allGames).map(
      ([author, joined, game]) => {
        const maybeSnapshot = this.latestSnapshots[encodeHashToBase64(game.dna_hash)];
        if (!maybeSnapshot) {
          this.refreshGame(game);
        }
        return html `
          <sl-card class="card-game --sl-shadow-large">
            <div slot="image" style="background: #0d0c0c;" @click=${() => {this.refreshGame(game)}}>
            ${maybeSnapshot && joined
              //? html`<div>${maybeSnapshot.timeBucketIndex}</div>`
              ? html`<canvas  id="canvas-${encodeHashToBase64(game.dna_hash)}" width="150" height="150" class="place-preview">`
              : html`<sl-skeleton class="square"></sl-skeleton>`
            }
            </div>
            <strong><abbr title="by ${author}">${game.name}</abbr></strong>
            ${joined
              ? html`<sl-badge type="primary" pill>joined</sl-badge>`
              : html`<sl-badge type="neutral" pill>unjoined</sl-badge>`
            }
            <!-- <small>${encodeHashToBase64(game.dna_hash)}</small> -->
              <small>${maybeSnapshot? determineBucketTime(maybeSnapshot.timeBucketIndex, game.settings): ""}</small>
              <sl-details summary="Parameters">
                <div>startTime: ${game.settings.startTime}</div>
                <div>canvasSize: ${game.settings.canvasSize}</div>
                <div>bucketSizeSec: ${game.settings.bucketSizeSec}</div>
                <div>pixelsPerBucket: ${game.settings.pixelsPerBucket}</div>
                <div>snapshotInterval: ${game.settings.snapshotIntervalInBuckets}</div>
              </sl-details>
            <div slot="footer">
              <sl-button type="primary" @click=${() => {this.openGame(game)}}>open</sl-button>
              <!-- <sl-button @click=${() => {this.refreshGame(game)}}>refresh</sl-button> -->
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
        <!-- <h2>Available games (${gamesCount})</h2> -->
        <h2>Games</h2>
        <div>
            ${allGamesLi}
        </div>
      </div>
      <!-- Create new Place Game -->
      <sl-card id="card-create-new" style="margin:10px;">
        <strong slot="header">Create New Game</strong>
        <sl-input label="Name:" id="createNameInput" clearable type="text"></sl-input>
        <sl-input label="Canvas size (pixels):" id="createcanvasSizeInput" type="number" value="10" help-text="Must be even"></sl-input>
        <sl-input label="Timeframe duration (sec):" id="createbucketSizeInput" type="number" value="60" help-text="${MIN_BUCKET_SIZE_SEC} - ${MAX_BUCKET_SIZE_SEC}"></sl-input>
        <sl-input label="Pixels per timeframe:" id="createPpbInput" type="number" value="10"></sl-input>
        <sl-input label="Snapshot interval (in timeframes):" id="createIntervalInput" value="1" type="number"></sl-input>
        <span id="createHelper" style="display: none;margi-top:10px;color:red;"></span>
          <sl-button type="primary" @click=${this.onCreateGame} style="padding-top:10px;">
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

      #card-create-new {
        box-shadow: var(--sl-shadow-x-large)
      }


      #card-create-new [slot='header'] {
        font-size: larger;
      }

      #card-create-new sl-input {
        margin-bottom:15px;
      }

      .card-game {
        max-width: 300px;
        min-width: 300px;
        overflow: clip;
        background: greenyellow;
        box-shadow: var(--sl-shadow-x-large)
      }

      .place-preview {
        padding-left: 75px;
        image-rendering: optimizeSpeed;
        image-rendering: -moz-crisp-edges;
        image-rendering: -webkit-optimize-contrast;
        image-rendering: optimize-contrast;
        image-rendering: pixelated;
        -ms-interpolation-mode: nearest-neighbor;
      }
      .card-game small {
        color: var(--sl-color-neutral-500);
      }

      .card-game [slot='image'] {
        height: 150px;
      }

      .card-game [slot='footer'] {
        display: flex;
        justify-content: space-between;
        align-items: center;
        /*background: green;*/
      }

      .square::part(indicator) {
        /*--border-radius: var(--sl-border-radius-medium);*/
        height: 100%;
      }
    `]
  }
}
