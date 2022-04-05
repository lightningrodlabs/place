use hdk::hash_path::path::Component;
use hdk::prelude::*;
use zome_utils::now;
use crate::*;


/// Zome Callback
#[hdk_extern]
fn init(_: ()) -> ExternResult<InitCallbackResult> {
   debug!("*** init() callback START");
   /// Check properties
   let place_properties = get_properties();
   assert!(place_properties.bucket_size_sec < MAX_BUCKET_SIZE_SEC);
   assert!(place_properties.bucket_size_sec >= MIN_BUCKET_SIZE_SEC);
   /// First day only setup
   let start_day = days_since_epoch(place_properties.start_time);
   let current_day = days_since_epoch(now());
   if current_day == start_day {
      let day = Component::from(format!("{}", current_day));
      //let buckets_per_day = Math::ceil(MAX_BUCKET_SIZE_SEC / place_properties.bucket_size_sec);
      /// Set Global Anchors
      let mut origin_path = Path::from(path_kind::Days);
      origin_path.append_component(day);
      origin_path.ensure()?;
   }

   ///// Setup initial capabilities
   //init_caps(())?;

   /// Done
   debug!("*** init() callback DONE");
   Ok(InitCallbackResult::Pass)
}

