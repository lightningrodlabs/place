/** */
import {PlaceProperties} from "./bindings/place.types";

export const toHHMMSS = function (str: string) {
  var sec_num = parseInt(str, 10); // don't forget the second param
  var hours:any   = Math.floor(sec_num / 3600);
  var minutes:any = Math.floor((sec_num - (hours * 3600)) / 60);
  var seconds:any = sec_num - (hours * 3600) - (minutes * 60);

  if (hours   < 10) {hours   = "0"+hours;}
  if (minutes < 10) {minutes = "0"+minutes;}
  if (seconds < 10) {seconds = "0"+seconds;}
  return hours+':'+minutes+':'+seconds;
}



export function determineBucketTime(bucketIndex: number, settings: PlaceProperties): string {
  const bucketTime = bucketIndex * settings.bucketSizeSec - settings.startTime;
  return toHHMMSS(bucketTime.toString());
}
