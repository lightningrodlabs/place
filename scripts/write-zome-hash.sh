# Compute hash of place zome
value=`./hash_zome ./target/wasm32-unknown-unknown/release/zome_place.wasm`
echo "$value" > workdir/place_zome_hash.txt
echo
echo "     PLACE ZOME HASH = $value"
