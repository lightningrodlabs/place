use hdk::prelude::*;
use zome_utils::{now, zome_panic_hook};
use crate::entries::Snapshot;
use crate::functions::{get_latest_local_snapshot, get_snapshot_at};
use crate::publish_snapshot::*;
use crate::sec_to_bucket;


/// Zome Function
/// Publish next snapshot if not already created
#[hdk_extern]
pub fn publish_next_snapshot_at(current_bucket: u32) -> ExternResult<Option<HeaderHash>> {
   debug!("*** publish_next_snapshot_at({}) CALLED", current_bucket);
   std::panic::set_hook(Box::new(zome_panic_hook));

   let maybe_current = get_snapshot_at(current_bucket)?;
   /// Bail if current snapshot doesn't exist
   if maybe_current.is_none() {
      warn!("publish_next_snapshot_at({}) Aborting: current snapshot does not exist.", current_bucket);
      return Ok(None);
   }
   let mut current_snapshot = maybe_current.unwrap();
   let hh = publish_next_snapshot(&mut current_snapshot)?;
   return Ok(Some(hh));
}


/// Zome Function
#[hdk_extern]
pub fn publish_starting_snapshot(_: ()) -> ExternResult<Snapshot> {
   debug!("*** publish_starting_snapshot() CALLED");
   std::panic::set_hook(Box::new(zome_panic_hook));
   let first = Snapshot::create_first(Vec::new());
   let hh = publish_snapshot(&first)?;
   debug!("*** publish_starting_snapshot() first snapshot created: {}", first.time_bucket_index);
   Ok(first)
}


// ///
// pub fn publish_snapshot_at(current_bucket: u32) -> ExternResult<Vec<HeaderHash>> {
//    debug!("*** publish_snapshot_at({}) CALLED", current_bucket);
//    std::panic::set_hook(Box::new(zome_panic_hook));
//
//    let mut res = Vec::new();
//    let maybe_latest_snapshot = get_latest_local_snapshot()?;
//
//    /// Create first frame if no snapshot found
//    let mut latest_snapshot = if maybe_latest_snapshot.is_none() {
//       /// TODO: add starting placements to DNA properties
//       let first = Snapshot::create_first(Vec::new());
//       let hh = publish_snapshot(&first)?;
//       debug!("*** publish_snapshot_at() first snapshot created: {} / {}", first.time_bucket_index,  current_bucket);
//       res.push(hh);
//       first
//    } else {
//       maybe_latest_snapshot.unwrap()
//    };
//    /// Bail if already latest
//    if current_bucket <= latest_snapshot.time_bucket_index {
//       debug!("*** publish_snapshot_at({}) bailing: latest is {}", current_bucket, latest_snapshot.time_bucket_index);
//       return Ok(res);
//    }
//    /// Loop until now is reached
//    while latest_snapshot.time_bucket_index < current_bucket {
//       debug!("Loop publish next bucket: {} / {}", latest_snapshot.time_bucket_index + 1, current_bucket);
//       let hh = publish_next_snapshot(&mut latest_snapshot)?;
//       res.push(hh);
//    }
//    /// Done
//    Ok(res)
// }
