use hdk::prelude::*;
use zome_utils::*;
use crate::TIME_BUCKET_SIZE_SEC;


pub fn get_current_time_bucket() -> u32 {
   let bucket_index = now() / TIME_BUCKET_SIZE_SEC as u64;
   assert!(bucket_index < u32::MAX as u64);
   bucket_index as u32
}


// FIXME
pub fn get_bucket_path(_bucket_index: u32) -> ExternResult<EntryHash> {
   return error("Not implemented yet")
}