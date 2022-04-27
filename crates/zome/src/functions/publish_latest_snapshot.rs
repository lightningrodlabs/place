use hdk::prelude::*;
use zome_utils::{get_all_typed_local, now, zome_panic_hook};
use crate::entries::Snapshot;
use crate::publish_snapshot::*;
use crate::sec_to_bucket;

/// Zome function
/// RendererRole ONLY
/// Render the lastest snapshot
/// Return HeaderHashs of newly committed Snapshots
#[hdk_extern]
pub fn publish_latest_snapshot(_:()) -> ExternResult<Vec<HeaderHash>> {
   debug!("*** publish_latest_snapshot() CALLED");
   std::panic::set_hook(Box::new(zome_panic_hook));
   let current_bucket = sec_to_bucket(now());
   let mut res = Vec::new();
   let maybe_latest_snapshot = get_latest_local_snapshot()?;
   /// Create first frame if no snapshot found
   let mut latest_snapshot = if maybe_latest_snapshot.is_none() {
      /// TODO: add starting placements to DNA properties
      let first = Snapshot::create_first(Vec::new());
      let hh = publish_snapshot(&first)?;
      debug!("*** publish_latest_snapshot() first snapshot created: {} / {}", first.time_bucket_index,  current_bucket);
      res.push(hh);
      first
   } else {
      maybe_latest_snapshot.unwrap()
   };
   /// Bail if already latest
   if current_bucket <= latest_snapshot.time_bucket_index {
      return Ok(Vec::new());
   }
   /// Loop until now is reached
   while latest_snapshot.time_bucket_index < current_bucket {
      debug!("Loop publish next bucket: {} / {}", latest_snapshot.time_bucket_index + 1, current_bucket);
      let hh = publish_next_snapshot(&mut latest_snapshot)?;
      res.push(hh);
   }
   /// Done
   Ok(res)
}


/// RendererRole ONLY
pub fn get_latest_local_snapshot() -> ExternResult<Option<Snapshot>> {
   let all = get_all_typed_local::<Snapshot>(entry_type!(Snapshot)?)?;
   debug!("get_latest_local_snapshot() -> {}", all.len());
   if all.is_empty() {
      return Ok(None);
   }
   let mut latest_index = 0;
   let mut latest_bucket = all[0].time_bucket_index;
   let mut i = 0;
   for snapshot in all.iter() {
      if snapshot.time_bucket_index >  latest_bucket {
         latest_bucket = snapshot.time_bucket_index;
         latest_index = i;
      }
      i += 1;
   }
   Ok(Some(all[latest_index].clone()))
}
