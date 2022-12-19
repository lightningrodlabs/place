#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]

use hdi::prelude::*;
use place_model::*;

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Game {
   name: String,
   dna_hash: DnaHash,
   settings: PlaceProperties,
}

#[hdk_entry_defs]
#[unit_enum(PlaceDashboardEntryTypes)]
pub enum PlaceDashboardEntry {
   #[entry_def(required_validations = 2, visibility = "public")]
   Game(Game),
}


/// List of all Link kinds handled by this Zome
#[hdk_link_types]
pub enum LinkKind {
   Path,
   Participants,
   Participations,
}
