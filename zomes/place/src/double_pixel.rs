use hdk::prelude::*;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct DoublePixel(u8);

impl DoublePixel {
   pub fn new(upper: u8, lower: u8) -> Self {
      assert!(upper < 16);
      assert!(lower < 16);
      let double = upper << 4 | lower;
      Self(double)
   }

   pub fn upper(&self) -> u8 {
      self.0 >> 4
   }

   pub fn lower(&self) -> u8 {
      self.0 & 0x0F
   }


   // pub fn copy_upper(&mut self, other: &DoublePixel) {
   //    self.0 &= other.0 & 0xF0
   // }
   //
   // pub fn copy_lower(&mut self, other: &DoublePixel) {
   //    self.0 = self.0 & 0xF0 & (other.0 & 0x0F)
   // }

   pub fn set_upper(&mut self, upper: u8) {
      assert!(upper < 16);
      self.0 = self.0 & 0x0F | upper << 4
   }

   pub fn set_lower(&mut self, lower: u8) {
      assert!(lower < 16);
      self.0 = self.0 & 0xF0 | lower
   }

   pub fn set_half(&mut self, half: u8, is_upper: bool) {
      assert!(half < 16);
      if is_upper {
         self.set_upper(half)
      } else  {
         self.set_lower(half)
      }
   }
}