use hdk::prelude::*;
use zome_utils::*;
use crate::entries::Snapshot;
use crate::PlaceLinkKind;
use crate::utils::*;


/// Zome Function
#[hdk_extern]
pub fn get_snapshot(time_bucket_index: u32) -> ExternResult<Snapshot> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   debug!("*** get_snapshot() CALLED - bucket: {}", time_bucket_index);
   let bucket_path = get_bucket_path((time_bucket_index * get_dna_properties().bucket_size_sec) as u64);
   debug!("get_snapshot() at path: {}", path_to_str(&bucket_path));
   let pairs = get_typed_from_links::<Snapshot>(
      bucket_path.path_entry_hash()?,
      PlaceLinkKind::Snapshot.as_tag_opt(),
   )?;
   if pairs.is_empty() {
      return error(&format!("Snapshot not found for bucket: {}", time_bucket_index));
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
   debug!("*** get_latest_snapshot() CALLED");
   let starting_bucket = sec_to_bucket(get_dna_properties().start_time);
   let mut current_bucket = sec_to_bucket(now());
   debug!("*** get_latest_snapshot() now: {} ; starting time: {}", current_bucket, starting_bucket);
   /// Look back in time for a snapshot unless starting time is reached
   loop {
      let maybe = get_snapshot(current_bucket);
      if maybe.is_ok() {
         return maybe;
      }
      current_bucket -= 1;
      if current_bucket <= starting_bucket {
         break;
      }
   }
   return error("No snapshot found");
}
