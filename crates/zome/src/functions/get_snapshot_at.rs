use hdk::prelude::*;
use zome_utils::*;
use crate::entries::Snapshot;
use crate::functions::get_properties::get_dna_properties;
use crate::PlaceLinkKind;
use crate::utils::*;


/// Zome Function
/// Return Snapshot at given bucket, if any
#[hdk_extern]
pub fn get_snapshot_at(bucket_index: u32) -> ExternResult<Option<Snapshot>> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   debug!("*** get_snapshot_at() CALLED - bucket: {}", bucket_index);
   if bucket_index < sec_to_bucket(get_dna_properties().start_time) {
      warn!("get_snapshot_at() aborted: requested time_bucket is older than starting time.");
      return Ok(None)
   }
   let bucket_path =
     get_bucket_path((bucket_index * get_dna_properties().bucket_size_sec) as u64);
   debug!("get_snapshot_at() at path: {}", path_to_str(&bucket_path));
   let pairs = get_typed_from_links::<Snapshot>(
      bucket_path.path_entry_hash()?,
      PlaceLinkKind::Snapshot.as_tag_opt(),
   )?;
   if pairs.is_empty() {
      warn!("Snapshot not found for bucket: {}", bucket_index);
      return Ok(None);
      //return error(&format!("Snapshot not found for bucket: {}", time_bucket_index));
   }
   Ok(Some(pairs[0].0.clone()))
}


// /// RendererRole ONLY
// pub fn get_latest_local_snapshot() -> ExternResult<Option<Snapshot>> {
//    let all = get_all_typed_local::<Snapshot>(entry_type!(Snapshot)?)?;
//    debug!("get_latest_local_snapshot() -> {}", all.len());
//    if all.is_empty() {
//       return Ok(None);
//    }
//    let mut latest_index = 0;
//    let mut latest_bucket = all[0].time_bucket_index;
//    let mut i = 0;
//    for snapshot in all.iter() {
//       if snapshot.time_bucket_index >  latest_bucket {
//          latest_bucket = snapshot.time_bucket_index;
//          latest_index = i;
//       }
//       i += 1;
//    }
//    Ok(Some(all[latest_index].clone()))
// }
