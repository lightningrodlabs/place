#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]

use hdi::prelude::*;

pub use place_model::*;

#[derive(Serialize, Deserialize, SerializedBytes, Clone)]
#[hdk_entry_types]
#[unit_enum(PlaceEntryTypes)]
pub enum PlaceEntry {
   #[entry_type(required_validations = 2, visibility = "public")]
   Placement(Placement),
   #[entry_type(required_validations = 2, visibility = "public")]
   Snapshot(Snapshot),
}


/// List of all Link kinds handled by this Zome
#[hdk_link_types]
#[derive(Serialize, Deserialize)]
#[repr(u8)]
pub enum LinkKind {
   Placements,
   Snapshot,
}
