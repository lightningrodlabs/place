use hdk::prelude::*;
use crate::entries::Placement;
use crate::double_pixel::DoublePixel;
use crate::{get_properties, WORLD_SIZE};


/// A Public Entry representing the whole canvas for a specific time bucket
#[hdk_entry(id = "Snapshot")]
#[derive(Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
   pub image_data: Vec<DoublePixel>, // 2 x 4-bit pixels per u8
   pub time_bucket_index: u32,
}

impl Snapshot {
   ///
   pub fn new(image_data: Vec<DoublePixel>, time_bucket_index: u32) -> Self {
      assert!(image_data.len()  == (WORLD_SIZE * WORLD_SIZE / 2) as usize);
      Self {
         image_data,
         time_bucket_index,
      }
   }


   pub fn create_first(placements: Vec<Placement>) -> Self {
      //let mut image_data = Vec::with_capacity((WORLD_SIZE * WORLD_SIZE / 2) as usize);
      let mut image_data = vec![DoublePixel::new(0,0); (WORLD_SIZE * WORLD_SIZE / 2) as usize];

      update_image(&mut image_data, placements);
      let properties = get_properties(()).unwrap();
      Self {
         image_data,
         time_bucket_index: (properties.start_time / properties.bucket_size_sec as u64) as u32,
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
      assert!(self.image_data.len() == (WORLD_SIZE * WORLD_SIZE / 2) as usize);
      self.update_to(1, placements)
   }

   /// Increment Snapshot to a futur time bucket with the given new placements
   pub fn update_to(&mut self, bucket_increment: u16, placements: Vec<Placement>) {
      self.time_bucket_index = self.time_bucket_index + bucket_increment as u32;
      update_image(&mut self.image_data, placements);
   }

}


///
pub fn update_image(image_data: &mut Vec<DoublePixel>, placements: Vec<Placement>) {
   debug!("update_image(): {}", placements.len());
   for placement in placements {
      debug!("placing: {:?} | {}", placement, placement.index());
      let index: usize = (placement.index() / 2) as usize;
      image_data[index].set_half(
         placement.color(),
         placement.index() % 2 == 1,
      );
   }
}


