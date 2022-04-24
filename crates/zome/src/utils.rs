use hdk::prelude::*;
use hdk::hash_path::path::Component;
use zome_utils::*;
use crate::{path_kind, PlaceProperties};


///
#[hdk_extern]
pub fn get_properties(_:()) -> ExternResult<PlaceProperties> {
   let props = dna_info()?.properties;
   //debug!("props = {:?}", props);
   let properties: PlaceProperties = props.try_into()?;
   Ok(properties)
}

///
pub fn get_current_time_bucket() -> u32 {
   //let bucket_index = now() / TIME_BUCKET_SIZE_SEC as u64;
   let bucket_index = now() / get_properties(()).unwrap().bucket_size_sec as u64;
   assert!(bucket_index < u32::MAX as u64);
   bucket_index as u32
}

///
pub fn get_current_bucket_path() -> Path {
   let now = now();
   return get_bucket_path(now);
}

///
pub fn get_bucket_path(now: u64) -> Path {
   let place_properties = get_properties(()).unwrap();
   let buckets_per_day = (24_f32 * 3600_f32 / place_properties.bucket_size_sec as f32).ceil(); // 288
   let day_start_epoch = days_since_epoch(now) as u64 * 24 * 3600;
   let sec_since_start_of_day = now - day_start_epoch;
   assert!(sec_since_start_of_day < 24 * 3600);
   let mut day_path = get_day_path(now); // Days::DayIndex
   let bucket_index = sec_since_start_of_day / place_properties.bucket_size_sec as u64; // 287
   let current_path = if buckets_per_day >= 48_f32 {
      /// Create hour level, Days::DayIndex::HourIndex::BucketIndex
      let buckets_per_hour = (24_f32 / buckets_per_day).ceil() as u64; // 12
      let hour_index = bucket_index / buckets_per_hour; // 23
      let hour = Component::from(format!("{}", hour_index).as_str());
      day_path.append_component(hour);
      let bucket_since_hour = bucket_index % buckets_per_hour; // 11
      let bucket = Component::from(format!("{}", bucket_since_hour));
      day_path.append_component(bucket);
      day_path
   } else {
      /// No hour level, Path is Days::DayIndex::BucketIndex
      let bucket_path = Component::from(format!("{}", bucket_index));
      day_path.append_component(bucket_path);
      day_path
   };
   current_path.ensure().unwrap();
   current_path
}


///
pub fn days_since_epoch(time_sec: u64) -> u16 {
   let days = time_sec / 3600 / 24;
   assert!(days < u16::MAX as u64);
   days as u16
}


///
pub fn get_day_path(now: u64) -> Path {
   let day_index = days_since_epoch(now);
   let day = Component::from(format!("{}", day_index));
   let mut origin_path = Path::from(path_kind::Days);
   origin_path.append_component(day);
   origin_path
}
