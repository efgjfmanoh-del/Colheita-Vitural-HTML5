#!/usr/bin/env python3
import base64, io, os, pathlib, subprocess, tempfile, zipfile
script = pathlib.Path(__file__).resolve().with_name("sign-qa.sh")
with tempfile.TemporaryDirectory() as td:
    root = pathlib.Path(td)
    tools = root / "sdk/build-tools/35.0.0"
    tools.mkdir(parents=True)
    signer = tools / "apksigner"
    signer.write_text("""#!/usr/bin/env python3
import pathlib, sys
args = sys.argv[1:]
if args[0] == 'sign':
    store = pathlib.Path(args[args.index('--ks-pass')+1].removeprefix('file:'))
    key = pathlib.Path(args[args.index('--key-pass')+1].removeprefix('file:'))
    assert store != key, 'password streams must be independent'
    assert store.read_bytes() == key.read_bytes() == b'dummy-test-password\\n'
    assert pathlib.Path(args[args.index('--ks')+1]).read_bytes() == b'dummy-pkcs12'
elif args[0] == 'verify':
    print('Signer #1 certificate SHA-256 digest: fdefa3921fb2e0010e5f4a677589a7f8f8a450738626caab4c97dc7ad25f6f21')
else:
    raise SystemExit(1)
""")
    signer.chmod(0o700)
    bundle = io.BytesIO()
    with zipfile.ZipFile(bundle, "w") as z:
        z.writestr("qa.p12", b"dummy-pkcs12")
        z.writestr("password.txt", b"dummy-test-password")
    env = dict(os.environ, CV_QA_SIGNING_BUNDLE=base64.b64encode(bundle.getvalue()).decode(), RUNNER_TEMP=td, ANDROID_HOME=str(root / "sdk"))
    subprocess.run(["bash", "-n", str(script)], check=True)
    subprocess.run(["bash", str(script)], env=env, cwd=root, check=True)
    assert not list(root.glob("cv-sign.*")), "temporary signing files must be cleaned"
print("PASS independent password files and cleanup (mock signer, no production secrets)")
