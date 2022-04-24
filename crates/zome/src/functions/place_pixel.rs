use hdk::prelude::*;
use zome_utils::zome_panic_hook;

use crate::entries::*;
use crate::{get_current_bucket_path, PlaceLinkKind};


/// Zome Function
#[hdk_extern]
pub fn place_pixel(input: DestructuredPlacement) -> ExternResult<HeaderHash> {
   debug!("*** place_pixel() CALLED: {:?}", input);
   std::panic::set_hook(Box::new(zome_panic_hook));
   let placement = Placement::from_destructured(input);
   /// Commit
   let hh = create_entry(placement.clone())?;
   /// Link to current bucket path
   let eh = hash_entry(placement)?;
   let path = get_current_bucket_path();
   let _ = create_link(path.path_entry_hash()?, eh, PlaceLinkKind::Placements.as_tag())?;
   /// Done
   Ok(hh)
}
