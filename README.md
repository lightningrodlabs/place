# place

Starting time set in DNA as a dna property.

# Implementation

Time is divided into buckets of size 'bucket_size_sec'.
'bucket_size_sec' is a DNA property which corresponds to the allowed minimum time interval between placements of pixel per agent.
A "time_bucket_index" is the number of buckets since EPOCH.

DNA has a 'start_time' property which is the number of seconds since EPOCH.
It represents the starting time of the 'place'.
At every time bucket a snapshot is made by 'rendering nodes' or self.
The snapshot of bucket 42 is the result of all placements until bucket 41.


Agents creates "Placements" which is the attribution of an indexed color to a {x,y} pixel on the canvas.

A snapshot stores the latest placements for each pixel at a given time. 

