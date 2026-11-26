#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${CV_QA_SIGNING_BUNDLE:?Missing QA signing secret}"
: "${RUNNER_TEMP:?Missing runner temp}"
: "${ANDROID_HOME:?Missing SDK}"
scratch="$(mktemp -d "$RUNNER_TEMP/cv-sign.XXXXXX")"
trap 'rm -rf "$scratch"' EXIT
python3 - "$scratch" <<'PY'
import base64, io, os, pathlib, sys, zipfile
root = pathlib.Path(sys.argv[1])
payload = base64.b64decode(os.environ["CV_QA_SIGNING_BUNDLE"].strip(), validate=True)
with zipfile.ZipFile(io.BytesIO(payload)) as archive:
    if sorted(archive.namelist()) != ["password.txt", "qa.p12"]:
        raise SystemExit("Invalid QA bundle structure")
    if any(info.file_size > 32768 for info in archive.infolist()):
        raise SystemExit("Invalid QA bundle size")
    for name in ["qa.p12", "password.txt"]:
        (root / name).write_bytes(archive.read(name))
PY
unset CV_QA_SIGNING_BUNDLE
signer="$ANDROID_HOME/build-tools/35.0.0/apksigner"
"$signer" sign --ks "$scratch/qa.p12" --ks-type PKCS12 --ks-key-alias colheita-qa --ks-pass "file:$scratch/password.txt" --key-pass "file:$scratch/password.txt" --v1-signing-enabled false --v2-signing-enabled true --v3-signing-enabled false --v4-signing-enabled false --out android-test/qa-signed.apk android-test/app/build/outputs/apk/debug/app-debug.apk
"$signer" verify --verbose --print-certs android-test/qa-signed.apk > "$scratch/cert.txt"
grep -Fx "Signer #1 certificate SHA-256 digest: fdefa3921fb2e0010e5f4a677589a7f8f8a450738626caab4c97dc7ad25f6f21" "$scratch/cert.txt"
echo 'Certificado QA permanente conferido; nenhum segredo publicado.'
