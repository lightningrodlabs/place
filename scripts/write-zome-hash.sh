# Compute hash of place zome
value=`./hash_zome ./target/wasm32-unknown-unknown/release/place.wasm`
echo "$value" > dna/place_zome_hash.txt
echo
echo "     PLACE ZOME HASH = $value"
