#!/bin/sh
# Read only: no account data, cookies, tokens, DRM IDs, or full logcat.
set -eu
if [ "$#" -ne 1 ]; then
  echo "Usage: ADB=/path/to/adb $0 SHIELD_IP:5555" >&2
  exit 2
fi
adb_bin=${ADB:-adb}
shield_target=$1
"$adb_bin" -s "$shield_target" get-state
for property in ro.product.manufacturer ro.product.model ro.build.version.release ro.build.version.sdk ro.product.cpu.abilist ro.build.display.id; do
  printf '%s: ' "$property"
  "$adb_bin" -s "$shield_target" shell getprop "$property"
done
"$adb_bin" -s "$shield_target" shell dumpsys webviewupdate
"$adb_bin" -s "$shield_target" shell pm path com.megarohas.amtv.shield || echo "AMTV Shield is not installed yet"
