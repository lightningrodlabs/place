use hdk::prelude::*;
use zome_utils::*;
use crate::entries::Snapshot;
use crate::PlaceLinkKind;
use crate::utils::*;


/// Zome Function
#[hdk_extern]
pub fn get_snapshot(now: u64) -> ExternResult<Snapshot> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   debug!("*** get_snapshot() CALLED - {}", now);
   let bucket_path = get_bucket_path(now);
   debug!("get_snapshot() at path: {}", path_to_str(&bucket_path));
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
pub fn get_local_snapshots(_: ()) -> ExternResult<Vec<Snapshot>> {
   let all: Vec<Snapshot> = get_all_typed_local::<Snapshot>(entry_type!(Snapshot)?)?;
   Ok(all)
}


/// Zome Function
#[hdk_extern]
pub fn get_latest_snapshot(_:()) -> ExternResult<Snapshot> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   debug!("*** get_latest_snapshot() CALLED...");
   let mut current_time = now();
   /// Look back in time for a snapshot
   loop {
      let maybe = get_snapshot(current_time);
      if maybe.is_ok() {
         return maybe;
      }
      current_time -= get_dna_properties().bucket_size_sec as u64;
      if current_time <= get_dna_properties().start_time as u64 {
         break;
      }
   }
   return error("No snapshot found");
}
