use hdk::prelude::*;
use zome_utils::*;

use crate::entries::*;
use crate::{get_current_bucket_path, PlaceLinkKind};
use crate::functions::{get_author_rank, GetAuthorRankInput};
use crate::utils::*;

/// Zome Function
/// Add placement to current bucket
#[hdk_extern]
pub fn place_pixel(input: DestructuredPlacement) -> ExternResult<HeaderHash> {
   debug!("*** place_pixel() CALLED: {:?}", input);
   std::panic::set_hook(Box::new(zome_panic_hook));
   /// Make sure not already placed
   let now = now();
   let now_index = sec_to_bucket(now);
   let rank = get_author_rank(GetAuthorRankInput{
      author: agent_info()?.agent_latest_pubkey.into(),
      bucket_index: now_index
   })?;
   if rank != 0 {
      warn!("Me has already placed pixel at current bucket");
      return error("Me has already placed pixel at current bucket")
   }
   /// Prepare placement
   let placement = Placement::from_destructured(input);
   let path = get_current_bucket_path();
   /// Commit
   let hh = create_entry(placement.clone())?;
   /// Link to current bucket path
   let eh = hash_entry(placement)?;
   debug!("*** place_pixel() path: {} ({})", path_to_str(&path), sec_to_bucket(now));
   let _ = create_link(path.path_entry_hash()?, eh, PlaceLinkKind::Placements.as_tag())?;
   /// Done
   Ok(hh)
}


/** DEBUGGING API */

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PlaceAtInput {
   placement: DestructuredPlacement,
   bucket_index: u32,
}

/// Zome Function
/// Add placement to given bucket
#[hdk_extern]
pub fn place_pixel_at(input: PlaceAtInput) -> ExternResult<HeaderHash> {
   debug!("*** place_pixel_at() CALLED: {:?}", input);
   std::panic::set_hook(Box::new(zome_panic_hook));
   let placement = Placement::from_destructured(input.placement);
   let path = bucket_index_to_path(input.bucket_index);
   /// Commit
   let hh = create_entry(placement.clone())?;
   /// Link to current bucket path
   let eh = hash_entry(placement)?;
   debug!("*** place_pixel_at() path: {} ({})", path_to_str(&path), sec_to_bucket(now()));
   let _ = create_link(path.path_entry_hash()?, eh, PlaceLinkKind::Placements.as_tag())?;
   /// Done
   Ok(hh)
}
