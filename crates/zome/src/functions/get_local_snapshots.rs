use std::vec;
use hdk::prelude::*;
use zome_utils::*;
use crate::entries::Snapshot;

// /// Zome Function
// /// Return bucket index of all snapshots stored locally
// #[hdk_extern]
// pub fn get_local_snapshots(_: ()) -> ExternResult<Vec<u32>> {
//std::panic::set_hook(Box::new(zome_panic_hook));
//debug!("*** get_local_snapshots() CALLED");
//   let all: Vec<Snapshot> = get_all_typed_local::<Snapshot>(entry_type!(Snapshot)?)?;
//   let indexes = all.iter().map(|snapshot| snapshot.time_bucket_index).collect();
//   Ok(indexes)
// }



/// Zome Function
/// Return bucket index of all snapshots stored locally
#[hdk_extern]
pub fn get_local_snapshots(_: ()) -> ExternResult<Vec<u32>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  //debug!("*** get_local_snapshots() CALLED");
  let query_args = ChainQueryFilter::default()
    .include_entries(false)
    .header_type(HeaderType::Create)
    .entry_type(entry_type!(Snapshot)?);
  let els = query(query_args)?;
  //debug!("*** get_local_snapshots() els: {}", els.len());
  let mut creates: Vec<Create> = els.iter()
    .map(|el| {
      let header = el.header();
      if let Header::Create(create) = header {
        return Some(create);
      }
      None
    })
    .filter(|maybe_create| maybe_create.is_some())
    .map(|maybe_create| maybe_create.unwrap().to_owned())
    .collect();
  //debug!("*** get_local_snapshots() creates: {}", creates.len());
  //creates.sort_by(|a, b| a.header_seq.cmp(&b.header_seq));
  let maybe_latest = creates.pop();
  if maybe_latest.is_none() {
    return Ok(Vec::new());
  }
  let latest: Snapshot = get_latest_typed_from_eh(maybe_latest.unwrap().entry_hash)?.unwrap().0;
  //debug!("*** get_local_snapshots() latest: {}", latest.time_bucket_index);
  Ok(vec![latest.time_bucket_index])
}
