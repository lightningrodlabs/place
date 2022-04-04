use hdk::prelude::*;

use crate::entries::*;

/// Zome Function
/// Return HeaderHash of the commit Rendering entry
#[hdk_extern]
pub fn render_canvas(bucket_index: u32) -> ExternResult<HeaderHash> {
   assert!(bucket_index > 0);
   /// Grab previous bucket rendering
   let mut rendering = get_rendering(bucket_index - 1)?;
   /// Grab all current bucket placements
   let placements = get_placements(bucket_index)?;
   /// Filter duplicates
   // FIXME (CRDT magic?)
   /// Magically merge
   rendering.increment(placements)?;
   /// Commit new rendering
   let hh = create_entry(rendering)?;
   /// Link to current bucket
   // FIXME
   /// Done
   Ok(hh)
}