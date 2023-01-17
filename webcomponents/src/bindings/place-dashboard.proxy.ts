/* This file is generated by zits. Do not edit manually */

import {PlaceDashboardEntry, DoublePixel, DestructuredPlacement, Placement, PlaceProperties, Snapshot, Game, CreateGameInput, } from './place-dashboard.types';
import {
/** Types */
HoloHash,
AgentPubKey,
DnaHash,
WasmHash,
EntryHash,
ActionHash,
AnyDhtHash,
KitsuneAgent,
KitsuneSpace,
HoloHashB64,
AgentPubKeyB64,
DnaHashB64,
WasmHashB64,
EntryHashB64,
ActionHashB64,
AnyDhtHashB64,
InstalledAppId,
Signature,
CellId,
DnaProperties,
RoleName,
InstalledCell,
Timestamp,
HoloHashed,
NetworkInfo,
FetchQueueInfo,
/** Action */
SignedActionHashed,
ActionHashed,
ActionType,
Action,
NewEntryAction,
Dna,
AgentValidationPkg,
InitZomesComplete,
CreateLink,
DeleteLink,
OpenChain,
CloseChain,
Update,
Delete,
Create,
/** Capabilities */
CapSecret,
CapClaim,
ZomeCallCapGrant,
CapAccess,
CapGrant,
GrantedFunctionsType,
/** CounterSigning */
//CounterSigningSessionData,
//PreflightRequest,
//CounterSigningSessionTimes,
//ActionBase,
//CounterSigningAgents,
//PreflightBytes,
//Role,
//CountersigningAgentState,
/** DhtOps */
DhtOpType,
DhtOp,
getDhtOpType,
getDhtOpAction,
getDhtOpEntry,
getDhtOpSignature,
/** Entry */
EntryVisibility,
AppEntryDef,
EntryType,
EntryContent,
Entry,
/** Record */
Record as HcRecord,
RecordEntry as HcRecordEntry,
/** admin types */
InstalledAppInfoStatus,
StemCell,
Cell,
CellType,
CellInfo,
AppInfo,
MembraneProof,
FunctionName,
ZomeName,
ZomeDefinition,
IntegrityZome,
CoordinatorZome,
DnaDefinition,
ResourceBytes,
ResourceMap,
CellProvisioning,
DnaVersionSpec,
DnaVersionFlexible,
NetworkSeed,
ZomeLocation,
   } from '@holochain/client';

import {
/** Common */
DhtOpHashB64,
DhtOpHash,
/** DnaFile */
DnaFile,
DnaDef,
Zomes,
WasmCode,
/** entry-details */
EntryDetails,
RecordDetails,
Details,
DetailsType,
EntryDhtStatus,
/** Validation */
ValidationStatus,
ValidationReceipt,
   } from '@holochain-open-dev/core-types';

import {ZomeProxy} from '@ddd-qc/lit-happ';
import {placeDashboardFunctionNames} from './place-dashboard.fn';

/**
 *
 */
export class PlaceDashboardProxy extends ZomeProxy {
  static readonly DEFAULT_ZOME_NAME = "zPlaceDashboard"
  static readonly FN_NAMES = placeDashboardFunctionNames
 
  async getProperties(): Promise<PlaceProperties> {
    return this.call('get_properties', null);
  }

  async createGame(input: Game): Promise<EntryHash> {
    return this.call('create_game', input);
  }

  async listAllGames(): Promise<[AgentPubKey, Game][]> {
    return this.call('list_all_games', null);
  }

  async listMyGames(): Promise<[AgentPubKey, Game][]> {
    return this.call('list_my_games', null);
  }
}