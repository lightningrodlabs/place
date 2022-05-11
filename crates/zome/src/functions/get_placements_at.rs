use hdk::prelude::*;
use hdk::prelude::holo_hash::{AgentPubKeyB64, EntryHashB64};
use crate::entries::Placement;
use zome_utils::*;
use crate::PlaceLinkKind;
use crate::functions::get_properties::get_dna_properties;
use crate::utils::*;


/// Zome Function
/// Return all placements at given bucket
#[hdk_extern]
pub fn get_placements_at(time_bucket_index: u32) -> ExternResult<Vec<Placement>> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   debug!("*** get_placements_at() CALLED - {}", time_bucket_index);
   let time: u64 = time_bucket_index as u64 * get_dna_properties().bucket_size_sec as u64;
   let bucket_path = get_bucket_path(time);
   debug!("*** get_placements_at() bucket_path: {}", path_to_str(&bucket_path));
   /// Get placements at given bucket path
   let pairs = get_typed_from_links::<Placement>(
      bucket_path.path_entry_hash()?,
      PlaceLinkKind::Placements.as_tag_opt(),
   )?;
   let placements:Vec<Placement> = pairs.iter()
      .map(|pair| pair.0.clone())
      .collect();
   debug!("*** get_placements_at() END - {}", placements.len());
   Ok(placements)
}


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
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
         debug!("*** get_placement_author() {} == {}?", input.bucket_index, current_index);
         if current_index == input.bucket_index {
            return Ok(Some(header.hashed.content.author().to_owned().into()));
         }
      }
      //return error("No author found at given time bucket");
   }
   //return error("No entry found at given address");
   Ok(None)
}

