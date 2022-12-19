#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]

use hdi::prelude::*;

pub use place_model::*;

#[hdk_entry_defs]
#[unit_enum(PlaceEntryTypes)]
pub enum PlaceEntry {
   #[entry_def(required_validations = 2, visibility = "public")]
   Placement(Placement),
   #[entry_def(required_validations = 2, visibility = "public")]
   Snapshot(Snapshot),
}


/// List of all Link kinds handled by this Zome
#[hdk_link_types]
pub enum LinkKind {
   Placements,
   Snapshot,
}
