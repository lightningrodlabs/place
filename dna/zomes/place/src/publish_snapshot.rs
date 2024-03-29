use hdk::prelude::*;
#[allow(unused_imports)]
use place_model::*;
use place_integrity::*;

use crate::{
   functions::*,
   bucket_index_to_path, path_to_str,
};


/// Render next snapshot iteration and publish it to DHT
pub fn publish_next_snapshot(snapshot: &mut Snapshot) -> ExternResult<ActionHash> {
   /// Grab all placements
   let mut placements= Vec::new();
   for n in  0..get_dna_properties().snapshot_interval_in_buckets as u32 {
      let mut cur_placements = get_placements_at(snapshot.time_bucket_index + n)?;
      placements.append(&mut cur_placements)
   }
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
// /// Return ActionHash of the commit Rendering entry
// pub fn render_snapshot(bucket_index: u32) -> ExternResult<ActionHash> {
//    assert!(bucket_index > 0);
//    /// Grab previous bucket rendering
//    let mut snapshot = get_snapshot(bucket_index - 1)?;
//
// }



pub fn publish_snapshot(snapshot: &Snapshot) -> ExternResult<ActionHash> {
   /// Commit new rendering
   let ah = create_entry(PlaceEntry::Snapshot(snapshot.to_owned()))?;
   let eh = hash_entry(snapshot)?;
   /// Link to current bucket
   let path = bucket_index_to_path(snapshot.time_bucket_index);
   // assert!(path == get_current_bucket_path())
   debug!("Publishing snapshot at index {}, path: {}", snapshot.time_bucket_index , path_to_str(&path.clone().typed(LinkKind::Snapshot)?));
   let path_eh = path.path_entry_hash()?;
   let _ = create_link(path_eh, eh,LinkKind::Snapshot, LinkTag::from(()))?;
   /// Done
   Ok(ah)
}
