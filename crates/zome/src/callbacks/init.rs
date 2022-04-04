use hdk::prelude::*;

/// Zome Callback
#[hdk_extern]
fn init(_: ()) -> ExternResult<InitCallbackResult> {
   debug!("*** init() callback START");
   /// Set Global Anchors
   //Path::from(path_kind::Directory).ensure()?;

   ///// Setup initial capabilities
   //init_caps(())?;

   /// Done
   debug!("*** init() callback DONE");
   Ok(InitCallbackResult::Pass)
}
