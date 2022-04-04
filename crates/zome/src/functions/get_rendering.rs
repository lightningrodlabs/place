use hdk::prelude::*;
use zome_utils::*;
use crate::entries::Rendering;
use crate::utils::get_bucket_path;

/// Zome Function
#[hdk_extern]
pub fn get_rendering(bucket_index: u32) -> ExternResult<Rendering> {
   let bucket_path = get_bucket_path(bucket_index)?;
   let tag = LinkTag::new("Rendering".to_string());
   let pairs = get_typed_from_links::<Rendering>(bucket_path, Some(tag))?;
   if pairs.is_empty() {
      return error("Rendering not found for bucket");
   }
   Ok(pairs[0].0.clone())
}