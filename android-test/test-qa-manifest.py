import hashlib, pathlib, tempfile, unittest, runpy
m=runpy.run_path(str(pathlib.Path(__file__).with_name("qa-manifest.py")))
class TestManifest(unittest.TestCase):
    def test_manifest_and_rejections(self):
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d);data=b"test fixture only"
            (p/"ColheitaVitural-QA.apk").write_bytes(data)
            (p/"SHA256SUMS.txt").write_text(hashlib.sha256(data).hexdigest()+"  ColheitaVitural-QA.apk")
            (p/"badging.txt").write_text("package: name='br.com.colheitavitural.html5.qa' versionCode='109' versionName='0.1.9'\n")
            cert=m["CERT"]
            sig=f"Signer #1 certificate SHA-256 digest: {cert}\nVerified using v2 scheme (APK Signature Scheme v2): true\nNumber of signers: 1\n"
            (p/"signature.txt").write_text(sig)
            self.assertEqual(m["build"](p)["versionCode"],109)
            (p/"signature.txt").write_text(sig.replace(cert,"0"*64))
            with self.assertRaises(ValueError):m["build"](p)
            (p/"signature.txt").write_text(sig)
            (p/"ColheitaVitural-QA.apk").write_bytes(b"modified")
            with self.assertRaises(ValueError):m["build"](p)
if __name__=="__main__":unittest.main()
