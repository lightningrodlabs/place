import {ZomeViewModel} from "@ddd-qc/lit-happ";
import {PlaceDashboardProxy} from "../bindings/place-dashboard.proxy";
import {defaultDashboardPerspective, PlaceDashboardPerspective} from "./place-dashboard.perspective";
import {Game, PlaceProperties} from "../bindings/place-dashboard.types";
import {AgentPubKey, EntryHash, AgentPubKeyB64, DnaHashB64, encodeHashToBase64} from "@holochain/client";
import {Dictionary} from "@ddd-qc/cell-proxy";


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
    console.log("PlaceDashboardZvm.probeAll()")
    const allGames = await this.zomeProxy.listAllGames();
    const myGames = await this.zomeProxy.listMyGames();
    //console.log("PlaceDashboardZvm.probeAll()", Object.values(allGames).length, Object.values(myGames).length)

    const joinedGameHashs: DnaHashB64[] = myGames.map(([_author, game]) => {return encodeHashToBase64(game.dna_hash)});


    const tuples: Dictionary<[AgentPubKeyB64, boolean, Game]> = {};
    for (const [author, game] of allGames) {
      const joined = joinedGameHashs.includes(encodeHashToBase64(game.dna_hash));
      tuples[game.name] = [encodeHashToBase64(author), joined, game];
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
    console.log({game})
    if (this._perspective.allGames[game.name]) {
      Promise.reject("Game with same name already exists: " + game.name);
    }
    const eh = await this.zomeProxy.createGame(game);
    this._perspective.allGames[game.name] = [this.cell.agentPubKey, true, game];
    this.notifySubscribers();
    return eh
  }

  async listAllGames(): Promise<[AgentPubKey, Game, ][]> {
    return this.zomeProxy.listAllGames();
  }

  async listMyGames(): Promise<[AgentPubKey, Game, ][]> {
    return this.zomeProxy.listMyGames();
  }

}
