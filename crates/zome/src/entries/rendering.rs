use hdk::prelude::*;
use crate::entries::Placement;


/// A Public Entry representing the whole canvas for a specific time bucket
#[hdk_entry(id = "Rendering")]
#[derive(Clone, PartialEq)]
pub struct Rendering {
   pub image_data: Vec<u8>, // 2 4-bit pixels per u8
   pub time_bucket_index: u32,
}

impl Rendering {
   pub fn new(image_data: Vec<u8>, time_bucket_index: u32) -> Self {
      Self {
         image_data,
         time_bucket_index,
      }
   }


   /// Input: Rendering + Placements
   /// Output: Rendering
   pub fn increment(&mut self, placements: Vec<Placement>) {
      self.time_bucket_index = self.time_bucket_index  + 1;
      ///
      for placement in placements {
         let index: usize = (placement.index() / 2) as usize;
         let color: u8 = if placement.index() % 2 == 1 {
            placement.color() << 4 | (self.image_data[index] & 0x0F)
         } else {
            placement.color() | (self.image_data[index] & 0xF0)
         };
         self.image_data[index] = color;
      }
   }

}


