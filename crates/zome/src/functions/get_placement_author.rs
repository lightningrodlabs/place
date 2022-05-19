use hdk::prelude::*;
use hdk::prelude::holo_hash::{AgentPubKeyB64};
use crate::entries::Placement;
use zome_utils::*;
use crate::utils::*;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetPlacementAuthorInput {
  pub placement: u32,
  pub bucket_index: u32,
}

/// Zome Function
/// Return Author of placement at given bucket index
#[hdk_extern]
pub fn get_placement_author(input: GetPlacementAuthorInput) -> ExternResult<Option<AgentPubKeyB64>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  debug!("*** get_placement_author() CALLED - {}", input.bucket_index);
  let placementEh = hash_entry(Placement::from(input.placement))?;
  let maybe_details = get_details(placementEh, GetOptions::latest())?;
  if let Some(Details::Entry(entry_details)) = maybe_details {
    /// Look for a header created during given bucket_index time interval
    for header in entry_details.headers {
      let current = header.hashed.content.timestamp().as_seconds_and_nanos().0;
      let current_index = sec_to_bucket(current as u64);
      debug!("*** get_placement_author()          {} == {}?", input.bucket_index, current_index);
      if current_index == input.bucket_index {
        return Ok(Some(header.hashed.content.author().to_owned().into()));
      }
    }
    //return error("No author found at given time bucket");
  }
  //return error("No entry found at given address");
  Ok(None)
}
