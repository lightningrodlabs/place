use hdk::prelude::*;
use crate::WORLD_SIZE;


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct DestructuredPlacement {
   x: u16,
   y: u16,
   color: u8,
}

/// A Public Entry representing a pixel placement by an agent
#[hdk_entry(id = "Placement")]
#[derive(Clone, PartialEq)]
pub struct Placement {
   pixel: u32,
}

impl Placement {

   pub fn from_destructured(input: DestructuredPlacement) -> Self {
      Self::new(input.x, input.y, input.color)
   }


   pub fn new(x: u16, y: u16, color: u8) -> Self {
      assert!(x < WORLD_SIZE as u16);
      assert!(y < WORLD_SIZE as u16);
      assert!(color < 16);

      let x_32: u32 = (x as u32) << 20;
      let y_32: u32 = (y as u32) << 4;

      Self {
         pixel:  x_32 + y_32 + color as u32,
      }
   }

   // pub fn index(&self) -> u32 {
   //    self.pixel >> 4
   // }

   pub fn index(&self) -> u32 {
      //debug!("Index of {:?} | {} x {}", self, self.x(), self.y());
      return self.x() as u32 + self.y() as u32 * WORLD_SIZE;
   }


   pub fn x(&self) -> u16 {
      let x = (self.pixel >> 20) as u16;
      assert!(x < WORLD_SIZE as u16);
      x
   }

   pub fn y(&self) -> u16 {
      let y = ((self.pixel >> 4) & 0x000003FF) as u16;
      assert!(y < WORLD_SIZE as u16);
      y
   }

   pub fn color(&self) -> u8 {
      let color = (self.pixel & 0x0000000F) as u8;
      assert!(color < 16);
      color
   }
}

