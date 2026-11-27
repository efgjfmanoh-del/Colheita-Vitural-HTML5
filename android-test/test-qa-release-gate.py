#!/usr/bin/env python3
import os, pathlib, shutil, subprocess, tempfile, unittest
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
            self.assertEqual(run('refs/heads/main'),'ready=true')
            self.assertEqual(run('refs/heads/feature/test'),'ready=false')
            js=p/'android-test/qa-progression-authorization.json'
            original=js.read_bytes()
            js.write_bytes(original+b'\n// unauthorized change\n')
            self.assertEqual(run('refs/heads/main'),'ready=false')
            js.write_bytes(original)
            grad=p/'android-test/app/build.gradle'
            grad.write_text(grad.read_text().replace('versionCode 203','versionCode 204').replace("versionName '0.2.3'","versionName '0.2.4'"))
            self.assertEqual(run('refs/heads/main'),'ready=false')
if __name__=='__main__': unittest.main()
