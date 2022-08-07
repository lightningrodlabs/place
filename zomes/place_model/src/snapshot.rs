use holochain_deterministic_integrity::prelude::*;

use crate::Placement;
use crate::double_pixel::DoublePixel;
use crate::get_properties::get_dna_properties;

/// A Public Entry representing the whole canvas for a specific time bucket
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
   pub image_data: Vec<DoublePixel>, // 2 x 4-bit pixels per u8
   pub time_bucket_index: u32, // Number of 'bucket_size_sec' since EPOCH.
}


///
impl Snapshot {
   ///
   pub fn new(image_data: Vec<DoublePixel>, time_bucket_index: u32) -> Self {
      //assert!(image_data.len()  == (CANVAS_SIZE * CANVAS_SIZE / 2) as usize);
      Self {
         image_data,
         time_bucket_index,
      }
   }


   pub fn create_first(starting_placements: Vec<Placement>) -> Self {
      let properties = get_dna_properties();
      /// Create starting canvas with colorIndex = 0
      let mut image_data = vec![DoublePixel::new(0,0); (properties.canvas_size * properties.canvas_size / 2) as usize];
      /// Update canvas with starting placements
      apply_pixels_to_canvas(&mut image_data, starting_placements);
      let time_bucket_index =(properties.start_time / properties.bucket_size_sec as u64) as u32;
      let minus = time_bucket_index % properties.snapshot_interval_in_buckets as u32;
      let corrected_bucket_index = time_bucket_index - minus;
      debug!("Creating first snapshot. Starting time bucket is: {}", corrected_bucket_index);
      Self {
         image_data,
         time_bucket_index: corrected_bucket_index,
      }
   }

   /// Create new snapshot from a previous one with new placements
   pub fn from_previous(previous: &Snapshot, placements: Vec<Placement>) -> Self {
      let mut image_data = previous.image_data.clone();
      apply_pixels_to_canvas(&mut image_data, placements);
      Self {
         image_data,
         time_bucket_index: previous.time_bucket_index + 1,
      }
   }


   /// Increment Snapshot to next time bucket with the given new placements
   pub fn increment(&mut self, placements: Vec<Placement>) {
      //assert!(self.image_data.len() == (CANVAS_SIZE * CANVAS_SIZE / 2) as usize);
      self.update_to(get_dna_properties().snapshot_interval_in_buckets, placements)
   }

   /// Increment Snapshot to a futur time bucket with the given new placements
   pub fn update_to(&mut self, bucket_increment: u16, placements: Vec<Placement>) {
      self.time_bucket_index = self.time_bucket_index + bucket_increment as u32;
      apply_pixels_to_canvas(&mut self.image_data, placements);
   }

}


/// Apply placements to 'image_data'
pub fn apply_pixels_to_canvas(image_data: &mut Vec<DoublePixel>, placements: Vec<Placement>) {
   debug!("apply_pixels_to_canvas(): {} placements", placements.len());
   let canvas_size = get_dna_properties().canvas_size;
   for placement in placements {
      //debug!("placing: {:?} | {}", placement, placement.index());
      let index: usize = (placement.index(canvas_size) / 2) as usize;
      image_data[index].set_half(
         placement.colorIndex(),
         placement.index(canvas_size) % 2 == 1,
      );
   }
}


