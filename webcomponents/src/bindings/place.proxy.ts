/* This file is generated by zits. Do not edit manually */

import {MAX_BUCKET_SIZE_SEC, MIN_BUCKET_SIZE_SEC, Days, PlaceEntry, DoublePixel, DestructuredPlacement, Placement, PlaceProperties, Snapshot, GetAuthorRankInput, GetPlacementAuthorInput, PlaceAtInput, BucketRangeInput, } from './place.types';
import {
/** types.ts */
HoloHash,
AgentPubKey,
DnaHash,
WasmHash,
EntryHash,
ActionHash,
AnyDhtHash,
ExternalHash,
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
Duration,
HoloHashed,
NetworkInfo,
FetchPoolInfo,
/** hdk/action.ts */
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
/** hdk/capabilities.ts */
CapSecret,
CapClaim,
GrantedFunctionsType,
GrantedFunctions,
ZomeCallCapGrant,
CapAccess,
CapGrant,
///** hdk/countersigning.ts */
//CounterSigningSessionData,
//PreflightRequest,
//CounterSigningSessionTimes,
//ActionBase,
//CounterSigningAgents,
//PreflightBytes,
//Role,
//CountersigningAgentState,
/** hdk/dht-ops.ts */
DhtOpType,
DhtOp,
getDhtOpType,
getDhtOpAction,
getDhtOpEntry,
getDhtOpSignature,
/** hdk/entry.ts */
EntryVisibility,
AppEntryDef,
EntryType,
EntryContent,
Entry,
/** hdk/record.ts */
Record as HcRecord,
RecordEntry as HcRecordEntry,
/** api/admin/types.ts */
InstalledAppInfoStatus,
DeactivationReason,
DisabledAppReason,
StemCell,
ProvisionedCell,
ClonedCell,
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
CellProvisioningStrategy,
CellProvisioning,
DnaVersionSpec,
DnaVersionFlexible,
AppRoleDnaManifest,
AppRoleManifest,
AppManifest,
AppBundle,
AppBundleSource,
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
import {placeFunctionNames} from './place.fn';

/**
 *
 */
export class PlaceProxy extends ZomeProxy {
  static readonly DEFAULT_ZOME_NAME = "zPlace"
  static readonly FN_NAMES = placeFunctionNames
 
  async getProperties(): Promise<PlaceProperties> {
    return this.call('get_properties', null);
  }



  async getAuthorRank(input: GetAuthorRankInput): Promise<number> {
    return this.call('get_author_rank', input);
  }

  async getLocalSnapshots(): Promise<number[]> {
    return this.call('get_local_snapshots', null);
  }

  async getPlacementAuthor(input: GetPlacementAuthorInput): Promise<AgentPubKeyB64 | null> {
    return this.call('get_placement_author', input);
  }

  async getPlacementsAt(timeBucketIndex: number): Promise<Placement[]> {
    return this.call('get_placements_at', timeBucketIndex);
  }

  async getPublishersAt(timeBucketIndex: number): Promise<AgentPubKeyB64[]> {
    return this.call('get_publishers_at', timeBucketIndex);
  }

  async getSnapshotAt(bucketIndex: number): Promise<Snapshot | null> {
    return this.call('get_snapshot_at', bucketIndex);
  }

  async placePixel(input: DestructuredPlacement): Promise<ActionHash> {
    return this.call('place_pixel', input);
  }

  async placePixelAt(input: PlaceAtInput): Promise<ActionHash> {
    return this.call('place_pixel_at', input);
  }

  async publishNextSnapshotAt(currentBucket: number): Promise<ActionHash | null> {
    return this.call('publish_next_snapshot_at', currentBucket);
  }

  async publishStartingSnapshot(): Promise<Snapshot> {
    return this.call('publish_starting_snapshot', null);
  }

  async publishSameSnapshotUpto(input: BucketRangeInput): Promise<ActionHash[]> {
    return this.call('publish_same_snapshot_upto', input);
  }
}
