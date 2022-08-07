use super::*;


///
#[hdk_extern]
fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
  match op {
    Op::StoreEntry { entry, .. } => __validate_create_entry(entry),
    _ => Ok(ValidateCallbackResult::Valid),
  }
}


///
pub fn __validate_create_entry(entry: Entry) -> ExternResult<ValidateCallbackResult> {
  match entry {
    _ => Ok(ValidateCallbackResult::Valid),
  }
}
