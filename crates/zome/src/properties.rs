use hdk::prelude::*;

/// Dna properties
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, SerializedBytes)]
pub struct PlaceProperties {
   /// seconds since UNIX_EPOCH
   pub start_time: u64,
   //pub canvas_size: u16,
   pub bucket_size_sec: u32,
}