use hdk::prelude::*;
use zome_utils::{get_all_typed_local, now, zome_panic_hook};
use crate::entries::Snapshot;
use crate::functions::get_latest_local_snapshot;
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
   return publish_snapshot_at(current_bucket);
}


#[hdk_extern] // extern for debugging only
pub fn publish_snapshot_at(current_bucket: u32) -> ExternResult<Vec<HeaderHash>> {
   debug!("*** publish_snapshot_at({}) CALLED", current_bucket);
   std::panic::set_hook(Box::new(zome_panic_hook));

   let mut res = Vec::new();
   let maybe_latest_snapshot = get_latest_local_snapshot()?;

   /// Create first frame if no snapshot found
   let mut latest_snapshot = if maybe_latest_snapshot.is_none() {
      /// TODO: add starting placements to DNA properties
      let first = Snapshot::create_first(Vec::new());
      let hh = publish_snapshot(&first)?;
      debug!("*** publish_snapshot_at() first snapshot created: {} / {}", first.time_bucket_index,  current_bucket);
      res.push(hh);
      first
   } else {
      maybe_latest_snapshot.unwrap()
   };
   /// Bail if already latest
   if current_bucket <= latest_snapshot.time_bucket_index {
      debug!("*** publish_snapshot_at({}) bailing: latest is {}", current_bucket, latest_snapshot.time_bucket_index);
      return Ok(res);
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
