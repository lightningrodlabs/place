use hdk::prelude::*;
use crate::entries::{Placement};
use zome_utils::*;
use crate::utils::get_bucket_path;


/// Zome Function
#[hdk_extern]
pub fn get_placements(bucket_index: u32) -> ExternResult<Vec<Placement>> {
   let bucket_path = get_bucket_path(bucket_index)?;
   let tag = LinkTag::new("Placements".to_string());
   let pairs = get_typed_from_links::<Placement>(bucket_path, Some(tag))?;
   let placements = pairs.iter().map(|pair| pair.0.clone()).collect();
   Ok(placements)
}