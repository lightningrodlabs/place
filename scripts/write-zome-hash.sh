# Compute hash of place zome
value=`./hash_zome ./target/wasm32-unknown-unknown/release/where.wasm`
echo "$value" > dna/where_zome_hash.txt
echo
echo "     PLACE ZOME HASH = $value"
