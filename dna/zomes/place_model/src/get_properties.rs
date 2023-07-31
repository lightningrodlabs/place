use hdi::prelude::*;
use crate::properties::PlaceProperties;

/// Return the DNA properties
#[hdk_extern]
pub fn get_properties(_:()) -> ExternResult<PlaceProperties> {
  //debug!("*** get_properties() called");
  let dna_info = dna_info()?;
  let props = dna_info.modifiers.properties;
  //debug!("props = {:?}", props);
  let maybe_properties: Result<PlaceProperties, <PlaceProperties as TryFrom<SerializedBytes>>::Error> = props.try_into();
  if let Err(e) = maybe_properties {
    debug!("deserializing properties failed: {:?}", e);
    panic!("Should deserialize dna properties");
  }
  Ok(maybe_properties.unwrap())
}

/// Helper for crate use
pub fn get_dna_properties() -> PlaceProperties {
  return get_properties(()).unwrap();
}
