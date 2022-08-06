#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]

use holochain_deterministic_integrity::prelude::*;

mod placement;
mod snapshot;
mod double_pixel;
mod get_properties;
mod properties;

pub use crate::placement::*;
pub use crate::snapshot::*;
pub use crate::double_pixel::*;
pub use crate::get_properties::*;
pub use crate::properties::*;


#[hdk_entry_defs]
#[unit_enum(UnitEntryTypes)]
pub enum PlaceEntry {
   #[entry_def(required_validations = 2, visibility = "public")]
   Placement(Placement),
   #[entry_def(required_validations = 2, visibility = "public")]
   Snapshot(Snapshot),
}
