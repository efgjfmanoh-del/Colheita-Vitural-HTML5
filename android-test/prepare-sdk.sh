#!/usr/bin/env bash
set -euo pipefail
sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/usr/local/lib/android/sdk}}"
if ! mkdir -p "$sdk" 2>/dev/null || [[ ! -w "$sdk" ]]; then
  sdk="$RUNNER_TEMP/colheita-android-sdk"
  mkdir -p "$sdk"
fi
export ANDROID_HOME="$sdk" ANDROID_SDK_ROOT="$sdk"
printf 'ANDROID_HOME=%s\nANDROID_SDK_ROOT=%s\n' "$sdk" "$sdk" >> "$GITHUB_ENV"
ready() {
  [[ -s "$sdk/platforms/android-35/android.jar" && -x "$sdk/build-tools/35.0.0/apksigner" && -x "$sdk/build-tools/35.0.0/aapt" ]]
}
if ! ready; then
  manager="$(command -v sdkmanager || true)"
  if [[ ! -x "$manager" ]]; then
    manager="$(find "$sdk/cmdline-tools" -type f -name sdkmanager -print -quit 2>/dev/null || true)"
  fi
  if [[ ! -x "$manager" ]]; then
    scratch="$(mktemp -d "$RUNNER_TEMP/android-cli.XXXXXX")"
    curl --fail --location --retry 3 --max-time 300 -o "$scratch/tools.zip" https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
    unzip -q "$scratch/tools.zip" -d "$scratch"
    mkdir -p "$sdk/cmdline-tools"
    mv "$scratch/cmdline-tools" "$sdk/cmdline-tools/colheita"
    manager="$sdk/cmdline-tools/colheita/bin/sdkmanager"
  fi
  test -x "$manager"
  "$manager" --sdk_root="$sdk" --version
  "$manager" --sdk_root="$sdk" --licenses < <(yes)
  "$manager" --sdk_root="$sdk" 'platforms;android-35' 'build-tools;35.0.0'
fi
ready || { echo "SDK Android 35 incompleto" >&2; exit 1; }
"$sdk/build-tools/35.0.0/apksigner" version
"$sdk/build-tools/35.0.0/aapt" version
echo 'Android SDK 35 e Build Tools 35.0.0 conferidos.'
