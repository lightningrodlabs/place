#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]

extern crate strum;
#[macro_use] extern crate strum_macros;
#[macro_use] extern crate enum_ordinalize;

//----------------------------------------------------------------------------------------

mod callbacks;
mod entries;
mod functions;

mod utils;
mod constants;
mod double_pixel;
mod publish_snapshot;
mod link_kind;
mod path_kind;
mod properties;


//----------------------------------------------------------------------------------------

pub use constants::*;
pub use utils::*;
pub use link_kind::*;
pub use path_kind::*;
pub use properties::*;

//----------------------------------------------------------------------------------------

use hdk::prelude::*;
use entries::*;

///
entry_defs![
   Placement::entry_def(),
   Snapshot::entry_def(),
   /// -- Other
   PathEntry::entry_def()
];

