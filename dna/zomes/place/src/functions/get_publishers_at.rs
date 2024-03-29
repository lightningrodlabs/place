use hdk::prelude::*;
use zome_utils::*;
#[allow(unused_imports)]
use place_model::*;

use crate::functions::get_snapshot_at;
use holo_hash::AgentPubKeyB64;

/// Zome Function
/// Return authors of snapshot of given bucket, if any
#[hdk_extern]
pub fn get_publishers_at(time_bucket_index: u32) -> ExternResult<Vec<AgentPubKeyB64>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  debug!("*** get_publishers_at() CALLED - bucket: {}", time_bucket_index);
  let maybe_snapshot = get_snapshot_at(time_bucket_index)?;
  if maybe_snapshot.is_none() {
    return Ok(vec![])
  }
  let snapshotEh = hash_entry(maybe_snapshot.unwrap())?;
  let maybe_details = get_details(snapshotEh, GetOptions::latest())?;
  let mut publishers: Vec<AgentPubKeyB64> = Vec::new();
  if let Some(Details::Entry(entry_details)) = maybe_details {
    for action in entry_details.actions {
      let author = action.hashed.content.author();
      publishers.push(author.to_owned().into());
    }
  }
  publishers.sort();
  debug!("*** get_publishers_at() END - found: {}", publishers.len());
  Ok(publishers)
}
