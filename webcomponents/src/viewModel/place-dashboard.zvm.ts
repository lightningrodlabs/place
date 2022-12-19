import {ZomeViewModel} from "@ddd-qc/lit-happ";
import {PlaceDashboardProxy} from "../bindings/place-dashboard.proxy";
import {defaultDashboardPerspective, PlaceDashboardPerspective} from "./place-dashboard.perspective";
import {serializeHash} from "@holochain-open-dev/utils";
import {AgentPubKeyB64, Dictionary, DnaHashB64} from "@holochain-open-dev/core-types";
import {Game, PlaceProperties} from "../bindings/place-dashboard";
import {AgentPubKey, EntryHash} from "@holochain/client";

/**
 *
 */
export class PlaceDashboardZvm extends ZomeViewModel {

  /** Public */


  static readonly ZOME_PROXY = PlaceDashboardProxy;

  get zomeProxy(): PlaceDashboardProxy {return this._zomeProxy as PlaceDashboardProxy;}

  /** -- ViewModel -- */

  /* */
  get perspective(): PlaceDashboardPerspective {return this._perspective;}

  /* */
  protected hasChanged(): boolean {
    // TODO
    return true;
  }


  /** */
  async probeAll() {
    const allGames = await this.zomeProxy.listAllGames();
    const myGames = await this.zomeProxy.listMyGames();

    const joinedGameHashs: DnaHashB64[] = myGames.map(([_author, game]) => {return serializeHash(game.dna_hash)});


    const tuples: Dictionary<[AgentPubKeyB64, boolean, Game]> = {};
    for (const [author, game] of allGames) {
      const joined = joinedGameHashs.includes(serializeHash(game.dna_hash));
      tuples[game.name] = [serializeHash(author), joined, game];
    }
    /** Done */
    this._perspective = {allGames: tuples};
    this.notifySubscribers();
  }


  /** -- Perspective -- */

  private _perspective: PlaceDashboardPerspective = defaultDashboardPerspective();


  /** -- -- */

  async getProperties(): Promise<PlaceProperties> {
    return this.zomeProxy.getProperties();
  }

  async createGame(game: Game): Promise<EntryHash> {
    if (this._perspective.allGames[game.name]) {
      Promise.reject("Game with same name already exists: " + game.name);
    }
    return this.zomeProxy.createGame(game);
    this._perspective.allGames[game.name] = [this.agentPubKey, true, game];
    this.notifySubscribers();
  }

  async listAllGames(): Promise<[AgentPubKey, Game, ][]> {
    return this.zomeProxy.listAllGames();
  }

  async listMyGames(): Promise<[AgentPubKey, Game, ][]> {
    return this.zomeProxy.listMyGames();
  }

}
