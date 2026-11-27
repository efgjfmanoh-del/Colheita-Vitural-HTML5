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
            # A detached fixture without the validated Git ancestry is never publishable.
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
    def test_207_qa_scope(self):
        if "versionCode 207" not in (root/'app/build.gradle').read_text(): self.skipTest('Not 207')
        env={**os.environ,'GITHUB_REF':'refs/heads/qa/lote-final-025'}
        self.assertEqual(subprocess.check_output(['python3',str(root/'rc-release-gate.py')],env=env,text=True).strip(),'ready=true')
        self.assertEqual(subprocess.check_output(['python3',str(root/'rc-release-gate.py')],env={**env,'GITHUB_REF':'refs/heads/main'},text=True).strip(),'ready=false')
    def test_206_qa_scope(self):
        if "versionCode 206" not in (root/'app/build.gradle').read_text(): self.skipTest('Not 206')
        env={**os.environ,'GITHUB_REF':'refs/heads/qa/lote-final-025'}
        self.assertEqual(subprocess.check_output(['python3',str(root/'rc-release-gate.py')],env=env,text=True).strip(),'ready=true')
        self.assertEqual(subprocess.check_output(['python3',str(root/'rc-release-gate.py')],env={**env,'GITHUB_REF':'refs/heads/main'},text=True).strip(),'ready=false')
    def test_exact_205_qa_ancestry(self):
        grad=(root/'app/build.gradle').read_text()
        if "versionCode 205" not in grad:
            self.skipTest('Not candidate 205')
        gate=root/'rc-release-gate.py'
        env={**os.environ,'GITHUB_REF':'refs/heads/qa/lote-final-025'}
        parent=subprocess.check_output(['git','rev-parse','HEAD^'],cwd=root.parent,text=True).strip()
        expected='ready=true' if parent in {'ed7bdab1a6038e0f59886668dcaed85a4e2c4757','845f524a7abf779733e27f58aed0cb26cb8d39ed'} else 'ready=false'
        self.assertEqual(subprocess.check_output(['python3',str(gate)],env=env,text=True).strip(),expected)
        self.assertEqual(subprocess.check_output(['python3',str(gate)],env={**env,'GITHUB_REF':'refs/heads/main'},text=True).strip(),'ready=false')
if __name__=='__main__': unittest.main()
