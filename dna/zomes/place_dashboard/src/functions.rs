use hdk::prelude::*;
#[allow(unused_imports)]
use place_model::*;
use place_dashboard_integrity::*;
use zome_utils::*;

// use crate::{
//    functions::*,
//    bucket_index_to_path, path_to_str,
// };


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateGameInput {
  pub name: u32,
  pub now_bucket: u32,
}


#[hdk_extern]
pub fn create_game(input: Game) -> ExternResult<EntryHash> {
  debug!("*** create_game({}) CALLED", input.name);
  std::panic::set_hook(Box::new(zome_panic_hook));  
  let _ah = create_entry(PlaceDashboardEntry::Game(input.clone()))?;
  let eh = hash_entry(input.clone())?;
  let path = Path::from("games");
  let path_eh = path.path_entry_hash()?;
  let _ = create_link(path_eh, eh.clone(), LinkKind::Path, LinkTag::from(()))?;
  /// Link Game to participant
  let me = agent_info()?.agent_latest_pubkey;
  let _ = create_link(me.clone(), eh.clone(), LinkKind::Participations, LinkTag::from(()))?;
  let _ = create_link(eh.clone(), me, LinkKind::Participants, LinkTag::from(()))?;
  /// Done
  Ok(eh)
}


#[hdk_extern]
pub fn list_all_games(_: ()) -> ExternResult<Vec<(AgentPubKey, Game)>> {
  debug!("*** list_all_games() CALLED");
  std::panic::set_hook(Box::new(zome_panic_hook)); 
  let path = Path::from("games");
  let path_eh = path.path_entry_hash()?;
  let all_pairs = get_typed_from_actions_links::<Game>(path_eh, LinkKind::Path, None)?;
  return Ok(all_pairs);
}


#[hdk_extern]
pub fn list_my_games(_: ()) -> ExternResult<Vec<(AgentPubKey, Game)>> {
  debug!("*** list_my_games() CALLED");
  std::panic::set_hook(Box::new(zome_panic_hook)); 
  let me = agent_info()?.agent_latest_pubkey;
  let all_pairs = get_typed_from_actions_links::<Game>(me, LinkKind::Participations, None)?;
  return Ok(all_pairs);
}