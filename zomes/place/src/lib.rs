#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]


mod callbacks;
mod functions;

mod utils;
mod constants;
mod publish_snapshot;
mod path_kind;

pub use constants::*;
pub use utils::*;
pub use path_kind::*;


//--------------------------------------------------------------------------------------------------

use hdk::prelude::*;
pub use place_model::*;

#[hdk_entry_defs]
#[unit_enum(UnitEntryTypes)]
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
