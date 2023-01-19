use hdk::hash_path::path::Component;
use hdk::prelude::*;
use zome_utils::now;
#[allow(unused_imports)]
use place_model::*;
use place_integrity::*;
use crate::*;

/// Zome Callback
#[hdk_extern]
fn init(_: ()) -> ExternResult<InitCallbackResult> {
   debug!("*** init() callback START");
   /// TODO: Move to genesis self check callback
   /// Check properties
   let maybe_place_properties = get_properties(());
   //debug!("maybe_place_properties = {:?}", maybe_place_properties);
   if let Err(e) = &maybe_place_properties {
      let err_msg = format!("Failed parsing DNA properties: {:?}", e);
      error!(err_msg);
      return Ok(InitCallbackResult::Fail(err_msg));
   }
   let place_properties = maybe_place_properties.unwrap();
   debug!("*** init() place_properties: {:?}", place_properties);
   if place_properties.bucket_size_sec >= MAX_BUCKET_SIZE_SEC
   || place_properties.bucket_size_sec < MIN_BUCKET_SIZE_SEC {
      let err_msg = format!("Invalid DNA property \"bucket_size_sec\" too small or too big. value = {}", place_properties.bucket_size_sec);
      return Ok(InitCallbackResult::Fail(err_msg));
   }
   if place_properties.canvas_size  % 2 > 0 {
      let err_msg = format!("Invalid DNA property \"canvas_size\" must be even. value = {}", place_properties.bucket_size_sec);
      return Ok(InitCallbackResult::Fail(err_msg));
   }
   /// First day only setup
   let start_day = days_since_epoch(place_properties.start_time);
   let current_day = days_since_epoch(now());
   if current_day == start_day {
      let day = Component::from(format!("{}", current_day));
      //let buckets_per_day = Math::ceil(MAX_BUCKET_SIZE_SEC / place_properties.bucket_size_sec);
      /// Set Global Anchors
      let mut origin_path = Path::from(path_kind::Days);
      origin_path.append_component(day);
      let origin_snapshot_path = origin_path.clone().typed(LinkKind::Snapshot)?;
      origin_snapshot_path.ensure()?;
      let origin_placements_path = origin_path.typed(LinkKind::Placements)?;
      origin_placements_path.ensure()?;
   }

   //// Setup initial capabilities
   //init_caps(())?;

   /// Done
   debug!("*** init() callback DONE");
   Ok(InitCallbackResult::Pass)
}

