# Get binary file extension according to platform
fileext=".exe"

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        fileext=""
elif [[ "$OSTYPE" == "darwin"* ]]; then
        fileext=""
fi

# Compute hash of the zome
value=`./hash_zome$fileext ./target/wasm32-unknown-unknown/release/place_model.wasm`
if [ "$value" == "" ]
then
  echo hash_zome failed
  exit 1
fi
echo "$value" > electron/bin/model_zome_hash.txt
echo
echo "PLACE MODEL ZOME HASH = $value"