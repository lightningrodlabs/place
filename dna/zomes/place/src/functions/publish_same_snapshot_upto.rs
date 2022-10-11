use hdk::prelude::*;
use zome_utils::zome_panic_hook;
#[allow(unused_imports)]
use place_model::*;

use crate::functions::get_snapshot_at;
use crate::publish_snapshot::*;


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BucketRangeInput {
  pub latest_known_bucket: u32,
  pub now_bucket: u32,
}


/// Zome Function
/// Publish many snapshots if not already created
#[hdk_extern]
pub fn publish_same_snapshot_upto(input: BucketRangeInput) -> ExternResult<Vec<ActionHash>> {
  debug!("*** publish_same_snapshot_upto({}, {}) CALLED", input.latest_known_bucket, input.now_bucket);
  std::panic::set_hook(Box::new(zome_panic_hook));
  assert!(input.now_bucket > input.latest_known_bucket);

  /// Get latest known snapshot
  let maybe_current = get_snapshot_at(input.latest_known_bucket)?;
  /// Bail if current snapshot doesn't exist
  if maybe_current.is_none() {
    warn!("publish_same_snapshot_upto({}) Aborting: latest known snapshot does not exist.", input.latest_known_bucket);
    return Ok(Vec::new())
  }
  let mut current_snapshot = maybe_current.unwrap();
  /// Publish next snapshot
  let ah = publish_next_snapshot(&mut current_snapshot)?;
  let mut res = Vec::new();
  res.push(ah);
  /* Publish same image_data at all buckets until `now_bucket` */
  for i in input.latest_known_bucket + 1..input.now_bucket + 1 {
    current_snapshot.time_bucket_index = i;
    let ah = publish_snapshot(&current_snapshot)?;
    res.push(ah);
  }
  /// Done
  return Ok(res)
}
