use hdk::prelude::*;
use crate::entries::{Placement};
use zome_utils::*;
use crate::{get_properties, PlaceLinkKind};
use crate::utils::*;


/// Zome Function
#[hdk_extern]
pub fn get_placements_at(time_bucket_index: u32) -> ExternResult<Vec<Placement>> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   debug!("*** get_placements_at() CALLED - {}", time_bucket_index);
   let time: u64 = time_bucket_index as u64 * get_properties(())?.bucket_size_sec as u64;
   let bucket_path = get_bucket_path(time);
   debug!("*** get_placements_at() bucket_path: {}", path_to_str(&bucket_path));
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
