use hdk::prelude::*;
use zome_utils::*;
#[allow(unused_imports)]
use place_model::*;

use crate::link_kind::*;
use crate::utils::*;

use crate::functions::{get_placement_author, GetPlacementAuthorInput};
use holo_hash::AgentPubKeyB64;

/// Zome Function
/// Return all placements at given bucket
#[hdk_extern]
pub fn get_placements_at(time_bucket_index: u32) -> ExternResult<Vec<Placement>> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   debug!("*** get_placements_at() CALLED - {}", time_bucket_index);
   let time: u64 = time_bucket_index as u64 * get_dna_properties().bucket_size_sec as u64;
   let bucket_path = get_bucket_path(time);
   debug!("*** get_placements_at() bucket_path: {}", path_to_str(&bucket_path.clone().typed(LinkKind::Placements)?));
   /// Get placements at given bucket path
   let mut pairs = get_typed_from_links::<Placement>(
      bucket_path.path_entry_hash()?,
      LinkKind::Placements.try_into().unwrap(),
      None,
   )?;
   /// Sort by Link timestamp
   pairs.sort_by(|a, b| b.1.timestamp.cmp(&a.1.timestamp));
   debug!("****** sorted pairs:");
   for pair in pairs.iter() {
      debug!(" - {:?}", pair.1.timestamp)
   }
   /// Return only Placement
   let placements: Vec<Placement> = pairs.iter()
      .map(|pair| pair.0.clone())
      .collect();
   /// Done
   debug!("*** get_placements_at() END - {}", placements.len());
   Ok(placements)
}



//#[hdk_extern]
pub fn get_placements_count_at(bucket_index: u32, input_author: AgentPubKeyB64) -> ExternResult<u16> {
   //std::panic::set_hook(Box::new(zome_panic_hook));
   //debug!("*** get_placements_count_at() CALLED - {}", bucket_index);
   let placements = get_placements_at(bucket_index)?;
   let mut i = 0;
   for placement in placements.iter() {
      let get_input = GetPlacementAuthorInput {
         placement: placement.pixel,
         bucket_index: bucket_index,
      };
      let maybe_author = get_placement_author(get_input)?;
      if let Some(author) = maybe_author {
         if author == input_author {
            i += 1;
         }
      }
   }
   Ok(i)
}
