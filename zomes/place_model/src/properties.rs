use holochain_deterministic_integrity::prelude::*;

/// Dna properties
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, SerializedBytes)]
#[serde(rename_all = "camelCase")]
pub struct PlaceProperties {
   pub start_time: u64, // seconds since UNIX_EPOCH
   pub canvas_size: u16,
   pub bucket_size_sec: u32,
   pub pixels_per_bucket: u16,
   pub snapshot_interval_in_buckets: u16,
   //pub starting_image: Vec<DoublePixel>
}
