use hdk::prelude::*;
use hdk::prelude::holo_hash::AgentPubKeyB64;
use zome_utils::*;
#[allow(unused_imports)]
use place_model::*;

use crate::functions::{get_placement_author, get_placements_at, GetPlacementAuthorInput};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetAuthorRankInput {
  pub author: AgentPubKeyB64,
  pub bucket_index: u32,
}

/// Zome Function
/// Return Render next snapshot rank of author
/// Return 0 if author has not published a pixel
#[hdk_extern]
pub fn get_author_rank(input: GetAuthorRankInput) -> ExternResult<u16> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  //debug!("*** get_author_rank() CALLED");
  let placements = get_placements_at(input.bucket_index)?;
  let mut i = 1;
  /* For each placement check if its author matchs input ; attribute rank according to the number
   * of placements we had to go through
   */
  for placement in placements.iter() {
    let author_input = GetPlacementAuthorInput {
      placement: placement.pixel,
      bucket_index: input.bucket_index,
    };
    let maybe_author = get_placement_author(author_input)?;
    if let Some(author) = maybe_author {
      if author == input.author {
        return Ok(i)
      }
    }
    i += 1;
  }
  Ok(0)
}
