import {EntryHashB64, HeaderHashB64, AgentPubKeyB64, serializeHash} from '@holochain-open-dev/core-types';
import {BaseClient, CellClient} from '@holochain-open-dev/cell-client';
import { writable, Writable, derived, Readable, get } from 'svelte/store';
import { PlaceService } from './place.service';
import {
  Dictionary, PlacementEntry,
  Signal, SnapshotEntry,
} from './types';

import {CellId} from "@holochain/client/lib/types/common";

const areEqual = (first: Uint8Array, second: Uint8Array) =>
      first.length === second.length && first.every((value, index) => value === second[index]);

export class PlaceStore {
  /** Private */
  private service : PlaceService

  /** SnapshotEh -> Snapshot */
  private snapshotStore: Writable<Dictionary<SnapshotEntry>> = writable({});
  /** PlacementEh -> Placement */
  private placementStore: Writable<Dictionary<PlacementEntry>> = writable({});

  /** Static info */
  myAgentPubKey: AgentPubKeyB64;

  /** Readable stores */
  public snapshots: Readable<Dictionary<SnapshotEntry>> = derived(this.snapshotStore, i => i)
  public placements: Readable<Dictionary<PlacementEntry>> = derived(this.placementStore, i => i)


  constructor(protected hcClient: BaseClient) {
    this.service = new PlaceService(hcClient, "place");

    let cellClient = this.service.cellClient
    this.myAgentPubKey = this.service.myAgentPubKey;

    cellClient.addSignalHandler( appSignal => {
      if (! areEqual(cellClient.cellId[0],appSignal.data.cellId[0]) || !areEqual(cellClient.cellId[1], appSignal.data.cellId[1])) {
        return
      }
      const signal = appSignal.data.payload
      //if (signal.message.type != "Ping" && signal.message.type != "Pong") {
      //  console.debug(`SIGNAL: ${signal.message.type}`, appSignal)
      //}
      // Send pong response
      if (signal.message.type != "Pong") {
        //console.log("PONGING ", payload.from)
        const pong: Signal = {
          maybeSpaceHash: signal.maybeSpaceHash,
          from: this.myAgentPubKey,
          message: {type: 'Pong', content: this.myAgentPubKey}
        };
        this.service.notify(pong, [signal.from])
      }
      // Handle signal
      switch(signal.message.type) {
        case "Ping":
        case "Pong":
          break;
        case "NewSnapshot":
          const svgEh = signal.message.content
          this.service.getSvgMarker(svgEh).then(svg => {
            this.svgMarkerStore.update(store => {
              store[svgEh] = svg
              return store
            })
          })
          break;
        case "NewPlacement":
          const groupEh = signal.message.content
          this.service.getEmojiGroup(groupEh).then(group => {
            this.emojiGroupStore.update(emojiGroups => {
              emojiGroups[groupEh] = group
              return emojiGroups
            })
          })
          break;
      }
    })
  }


  pingOthers(spaceHash: EntryHashB64, myKey: AgentPubKeyB64) {
    const ping: Signal = {maybeSpaceHash: spaceHash, from: this.myAgentPubKey, message: {type: 'Ping', content: myKey}};
    // console.log({signal})
    this.service.notify(ping, this.others());
  }

  //
  //
  // async addTemplate(template: TemplateEntry) : Promise<EntryHashB64> {
  //   const eh: EntryHashB64 = await this.service.createTemplate(template)
  //   this.templateStore.update(templates => {
  //     templates[eh] = template
  //     return templates
  //   })
  //   this.service.notify(
  //     {maybeSpaceHash: null, from: this.myAgentPubKey, message: {type:"NewTemplate", content: eh}}
  //     , this.others());
  //   return eh
  // }
  //
  // async updateSnapshots() : Promise<Dictionary<SnapshotEntry>> {
  //   const spaces = await this.service.getSpaces();
  //   //const hiddens = await this.service.getHiddenSpaceList();
  //   //console.log({hiddens})
  //   for (const space of spaces.values()) {
  //     //const visible = !hiddens.includes(space.hash)
  //     await this.addPlay(space.hash)
  //   }
  //   return get(this.playStore)
  // }
  //
  //
  // async addEmojiGroup(emojiGroup: EmojiGroupEntry) : Promise<EntryHashB64> {
  //   const eh: EntryHashB64 = await this.service.createEmojiGroup(emojiGroup)
  //   this.emojiGroupStore.update(emojiGroups => {
  //     emojiGroups[eh] = emojiGroup
  //     return emojiGroups
  //   })
  //   this.service.notify(
  //     {maybeSpaceHash: null, from: this.myAgentPubKey, message: {type:"NewEmojiGroup", content: eh}}
  //     , this.others());
  //   return eh
  // }


  /** Get latest entries of each type and update local store accordingly */
  async pullDht() {
    console.log("pullDht()")
    const {snapshots, placements} = await this.getLatestSnapshot();
    console.log(`Entries found: ${Object.keys(snapshots).length} | ${Object.keys(placements).length}`)
    //console.log({plays})
  }


  snapshot(eh: EntryHashB64): SnapshotEntry {
    return get(this.snapshotStore)[eh].space;
  }
}
