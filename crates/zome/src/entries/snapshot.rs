use hdk::prelude::*;
use crate::entries::Placement;
use crate::double_pixel::DoublePixel;


/// A Public Entry representing the whole canvas for a specific time bucket
#[hdk_entry(id = "Snapshot")]
#[derive(Clone, PartialEq)]
pub struct Snapshot {
   pub image_data: Vec<DoublePixel>, // 2 x 4-bit pixels per u8
   pub time_bucket_index: u32,
}

impl Snapshot {
   ///
   pub fn new(image_data: Vec<DoublePixel>, time_bucket_index: u32) -> Self {
      Self {
         image_data,
         time_bucket_index,
      }
   }


   pub fn create_first(placements: Vec<Placement>) -> Self {
      let mut image_data = Vec::new();
      update_image(&mut image_data, placements);
      Self {
         image_data,
         time_bucket_index: 0,
      }
   }

   ///
   pub fn from_previous(previous: &Snapshot, placements: Vec<Placement>) -> Self {
      let mut image_data = previous.image_data.clone();
      update_image(&mut image_data, placements);
      Self {
         image_data,
         time_bucket_index: previous.time_bucket_index + 1,
      }
   }


   /// Increment Snapshot to next time bucket with the given new placements
   pub fn increment(&mut self, placements: Vec<Placement>) {
      self.update(1, placements)
   }

   /// Increment Snapshot to a futur time bucket with the given new placements
   pub fn update(&mut self, bucket_increment: u16, placements: Vec<Placement>) {
      self.time_bucket_index = self.time_bucket_index + bucket_increment as u32;
      update_image(&mut self.image_data, placements);
   }


}


///
pub fn update_image(image_data: &mut Vec<DoublePixel>, placements: Vec<Placement>) {
   for placement in placements {
      let index: usize = (placement.index() / 2) as usize;
      image_data[index].set_half(
         placement.color(),
         placement.index() % 2 == 1,
      );
   }
}


