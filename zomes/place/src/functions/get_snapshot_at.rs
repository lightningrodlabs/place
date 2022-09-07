use hdk::prelude::*;
use zome_utils::*;
#[allow(unused_imports)]
use place_model::*;

use crate::{
   utils::*,
};


/// Zome Function
/// Return Snapshot at given bucket, if any
#[hdk_extern]
pub fn get_snapshot_at(bucket_index: u32) -> ExternResult<Option<Snapshot>> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   debug!("*** get_snapshot_at() CALLED - bucket: {}", bucket_index);
   let dna_properties = get_dna_properties();
   if bucket_index < get_start_bucket() {
      warn!("get_snapshot_at() aborted: requested time_bucket is older than starting time.");
      return Ok(None)
   }
   let minus = bucket_index % dna_properties.snapshot_interval_in_buckets as u32;
   let corrected_bucket_index = bucket_index - minus;

   let bucket_path =
     get_bucket_path((corrected_bucket_index * dna_properties.bucket_size_sec) as u64);
   debug!("get_snapshot_at() at path: {}", path_to_str(&bucket_path.clone().typed(LinkKind::Snapshot)?));
   let pairs: Vec<(Snapshot, Link)> = get_typed_from_links(
      bucket_path.path_entry_hash()?,
      LinkKind::Snapshot,
      None,
   )?;
   if pairs.is_empty() {
      warn!("Snapshot not found for bucket: {}", corrected_bucket_index);
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
