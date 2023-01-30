import {MAX_BUCKET_SIZE_SEC, MIN_BUCKET_SIZE_SEC, PlaceProperties} from "./bindings/place.types";

/** */
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


/** */
export function determineBucketTime(bucketIndex: number, settings: PlaceProperties): string {
  const bucketTime: number = bucketIndex * settings.bucketSizeSec - settings.startTime;
  if (bucketTime < 0) {
    return "00:00:00"
  }
  return toHHMMSS(bucketTime.toString());
}


/** */
export  function validateSettings(settings: PlaceProperties) {
  if (settings.canvasSize < 2) throw Error("Canvas size too small");
  if (settings.canvasSize > 100) throw Error("Canvas size too big");
  if (settings.canvasSize % 2  == 1) throw Error("Canvas size must be even");
  if (settings.bucketSizeSec < MIN_BUCKET_SIZE_SEC) throw Error("Timeframe duration too short");
  if (settings.bucketSizeSec > MAX_BUCKET_SIZE_SEC) throw Error("Timeframe duration too long");
  if (settings.pixelsPerBucket < 1) throw Error("Pixels per timeframe too small");
  if (settings.snapshotIntervalInBuckets < 1) throw Error("Snapshot interval too small");
}
