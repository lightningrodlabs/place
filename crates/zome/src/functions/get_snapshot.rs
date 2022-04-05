use hdk::prelude::*;
use zome_utils::*;
use crate::entries::Snapshot;
use crate::PlaceLinkKind;
use crate::utils::get_bucket_path;


/// Zome Function
#[hdk_extern]
pub fn get_snapshot(now: u64) -> ExternResult<Snapshot> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   debug!("*** get_snapshot() CALLED");
   let bucket_path = get_bucket_path(now);
   let pairs = get_typed_from_links::<Snapshot>(
      bucket_path.path_entry_hash()?,
      PlaceLinkKind::Snapshot.as_tag_opt(),
   )?;
   if pairs.is_empty() {
      return error(&format!("Snapshot not found for date: {}", now));
   }
   Ok(pairs[0].0.clone())
}


/// Zome Function
#[hdk_extern]
pub fn get_latest_snapshot(_:()) -> ExternResult<Snapshot> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   debug!("*** get_latest_snapshot() CALLED");
   //let current_bucket = get_current_time_bucket();
   return get_snapshot(now());
}