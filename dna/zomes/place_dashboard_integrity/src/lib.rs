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
   pub name: String,
   pub dna_hash: DnaHash,
   pub settings: PlaceProperties,
}

#[derive(Serialize, Deserialize, SerializedBytes, Clone)]
#[hdk_entry_types]
#[unit_enum(PlaceDashboardEntryTypes)]
pub enum PlaceDashboardEntry {
   #[entry_type(required_validations = 2, visibility = "public")]
   Game(Game),
}


/// List of all Link kinds handled by this Zome
#[hdk_link_types]
#[derive(Serialize, Deserialize)]
#[repr(u8)]
pub enum LinkKind {
   Path,
   Participants,
   Participations,
}
