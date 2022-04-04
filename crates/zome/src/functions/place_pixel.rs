use hdk::prelude::*;

use crate::entries::*;

/// Zome Function
#[hdk_extern]
pub fn place_pixel(placement_input: PlacePixelInput) -> ExternResult<HeaderHash> {
   let placement = Placement::from_input(placement_input);
   /// Commit
   let hh = create_entry(placement)?;
   /// Link to current time bucket
   // FIXME
   /// Done
   Ok(hh)
}