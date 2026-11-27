#!/usr/bin/env python3
import os, pathlib, re, shutil, subprocess, tempfile, unittest
root=pathlib.Path(__file__).resolve().parent
class Gate(unittest.TestCase):
    def test_qa_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=pathlib.Path(tmp)
            shutil.copytree(root,p/'android-test')
            shutil.copytree(root.parent/'html5-babylon',p/'html5-babylon',ignore=shutil.ignore_patterns('node_modules','dist','qa','.git'))
            gate=p/'android-test/rc-release-gate.py'
            def run(ref):
                return subprocess.check_output(['python3',str(gate)],env={**os.environ,'GITHUB_REF':ref},text=True).strip()
            grad=p/'android-test/app/build.gradle'
            actual=grad.read_text()
            js=p/'android-test/qa-progression-authorization.json'
            original=js.read_bytes()
            # Candidate branch itself is never publishable, even if a future
            # main release authorization is present.
            self.assertEqual(run('refs/heads/qa/lote-final-025'),'ready=false')
            if "versionCode 205" in actual:
                self.assertEqual(run('refs/heads/main'),'ready=false')
            # Explicit fixture for the historically authorized QA 204.
            grad.write_text(re.sub(r'versionCode \d+', 'versionCode 204', re.sub(r"versionName '[^']+'", "versionName '0.2.4'",actual)))
            js.write_text('{"version":204,"channel":"qa","scope":"eight-world-refinements"}')
            self.assertEqual(run('refs/heads/main'),'ready=true')
            self.assertEqual(run('refs/heads/feature/test'),'ready=false')
            approved=js.read_bytes()
            js.write_bytes(approved+b'\n// unauthorized change\n')
            self.assertEqual(run('refs/heads/main'),'ready=false')
            js.write_bytes(approved)
            grad.write_text(grad.read_text().replace('versionCode 204','versionCode 205').replace("versionName '0.2.4'","versionName '0.2.5'"))
            self.assertEqual(run('refs/heads/main'),'ready=false')
            grad.write_text(actual)
            js.write_bytes(original)
if __name__=='__main__': unittest.main()
