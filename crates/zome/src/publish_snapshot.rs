use hdk::prelude::*;

use crate::entries::*;
use crate::functions::*;
use crate::{get_current_bucket_path, path_to_str, PlaceLinkKind};


/// Render next snapshot iteration and publish it to DHT
pub fn publish_next_snapshot(snapshot: &mut Snapshot) -> ExternResult<HeaderHash> {
   /// Grab all current bucket placements
   let placements = get_placements_at(snapshot.time_bucket_index)?;
   /// Filter duplicates
   // FIXME (CRDT magic?)
   /// Merge
   snapshot.increment(placements);
   /// Commit new rendering
   let hh = publish_snapshot(snapshot)?;
   Ok(hh)
}

//
// /// Zome Function
// /// Return HeaderHash of the commit Rendering entry
// pub fn render_snapshot(bucket_index: u32) -> ExternResult<HeaderHash> {
//    assert!(bucket_index > 0);
//    /// Grab previous bucket rendering
//    let mut snapshot = get_snapshot(bucket_index - 1)?;
//
// }



pub fn publish_snapshot(snapshot: &Snapshot) -> ExternResult<HeaderHash> {
   /// Commit new rendering
   let hh = create_entry(snapshot)?;
   let eh = hash_entry(snapshot)?;
   /// Link to current bucket
   let path = get_current_bucket_path();
   debug!("Publishing snapshot at index {}, path: {}", snapshot.time_bucket_index , path_to_str(&path));
   let path_eh = path.path_entry_hash()?;
   let _ = create_link(path_eh, eh, PlaceLinkKind::Snapshot.as_tag())?;
   /// Done
   Ok(hh)
}
