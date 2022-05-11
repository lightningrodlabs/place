use hdk::prelude::*;
use crate::PlaceProperties;

/// Return the DNA properties
#[hdk_extern]
pub fn get_properties(_:()) -> ExternResult<PlaceProperties> {
  let props = dna_info()?.properties;
  //debug!("props = {:?}", props);
  let properties: PlaceProperties = props.try_into()?;
  Ok(properties)
}

/// Helper for crate use
pub fn get_dna_properties() -> PlaceProperties {
  return get_properties(()).unwrap();
}
