use hdk::prelude::*;
use zome_utils::*;
#[allow(unused_imports)]
use place_model::*;
use place_model::{
   PlaceEntry, LinkKind,
};

use crate::get_current_bucket_path;
use crate::functions::get_placements_count_at;
use crate::utils::*;


/// Zome Function
/// Add placement to current bucket
#[hdk_extern]
pub fn place_pixel(input: DestructuredPlacement) -> ExternResult<ActionHash> {
   debug!("*** place_pixel() CALLED: {:?}", input);
   std::panic::set_hook(Box::new(zome_panic_hook));
   /// Make sure not already placed
   let now = now();
   let now_index = sec_to_bucket(now);
   let placed_count = get_placements_count_at(
      now_index,
      agent_info()?.agent_latest_pubkey.into(),

   )?;
   if placed_count >= get_dna_properties().pixels_per_bucket {
      warn!("Pixel placement limit reached for current bucket");
      return error("Pixel placement limit reached for current bucket")
   }
   /// Prepare placement
   let placement = Placement::from_destructured(input);
   let path = get_current_bucket_path();
   /// Commit
   let hh = create_entry(PlaceEntry::Placement(placement.clone()))?;
   /// Link to current bucket path
   let eh = hash_entry(placement)?;
   debug!("*** place_pixel() path: {} ({})", path_to_str(&path.clone().typed(LinkKind::Placements)?), sec_to_bucket(now));
   let _ = create_link(
      path.path_entry_hash()?,
      eh,
      LinkKind::Placements,
      LinkTag::from(()),
   )?;
   /// Done
   Ok(hh)
}


/** DEBUGGING API */

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaceAtInput {
   placement: DestructuredPlacement,
   bucket_index: u32,
}

/// Zome Function
/// Add placement to given bucket
#[hdk_extern]
pub fn place_pixel_at(input: PlaceAtInput) -> ExternResult<ActionHash> {
   debug!("*** place_pixel_at() CALLED: {:?}", input);
   std::panic::set_hook(Box::new(zome_panic_hook));
   let placement = Placement::from_destructured(input.placement);
   let path = bucket_index_to_path(input.bucket_index);
   /// Commit
   let hh = create_entry(PlaceEntry::Placement(placement.clone()))?;
   /// Link to current bucket path
   let eh = hash_entry(placement)?;
   debug!("*** place_pixel_at() path: {} ({})", path_to_str(&path.clone().typed(LinkKind::Placements)?), sec_to_bucket(now()));
   let _ = create_link(
      path.path_entry_hash()?,
      eh,
      LinkKind::Placements,
      LinkTag::from(()),
   )?;
   /// Done
   Ok(hh)
}
