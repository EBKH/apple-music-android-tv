#!/bin/sh
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
sdk_dir=${AMTV_SDK:-"$project_dir/../android-sdk"}
signing_file=${AMTV_KEYSTORE:-"$project_dir/../signing/shield-dev.keystore"}
java_dir=${AMTV_JAVA_HOME:-$(/usr/libexec/java_home)}
if [ ! -f "$signing_file" ]; then
  echo "Set AMTV_KEYSTORE to a private development keystore. See SHIELD.md." >&2
  exit 1
fi
exec make -C "$project_dir" SDK="$sdk_dir" JAVA_HOME="$java_dir" KEYSTORE="$signing_file" "$@"
