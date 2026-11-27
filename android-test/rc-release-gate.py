#!/usr/bin/env python3
"""Authorize only the exact maintenance build or the fully validated consolidated RC."""
import json, pathlib, re, os, subprocess
root=pathlib.Path(__file__).resolve().parent
gradle=(root/'app/build.gradle').read_text()
name=re.search(r"versionName\s+'([^']+)'",gradle).group(1)
code=int(re.search(r"versionCode\s+(\d+)",gradle).group(1))
ref=os.environ.get('GITHUB_REF','')
required={'inventory','economy','construction','residence','agriculture','nature','animals','character','progression','audio','integrity'}
ready=False
if ref=='refs/heads/qa/0.1.52':
    ready=(name=='0.1.52' and code==152 and not (root/'rc-release-gate.json').exists())
elif ref=='refs/heads/main':
    data=json.loads((root/'rc-release-gate.json').read_text())
    ready=(data.get('schema')==1 and name=='0.2.0' and code==200 and name==data.get('target') and code==data.get('versionCode') and
           data.get('publish') is True and data.get('physicalValidation') is True and
           set(data.get('workstreams',{}))==required and all(v=='approved' for v in data['workstreams'].values()))
    # One explicitly authorized experimental maintenance release. The consolidated
    # RC gate above stays unchanged and no production channel is touched.
    if (name,code)==('0.2.1',201):
        approved={'html5-babylon/src/main.js':'b0359049c563f703c112766eb5d0cfdd81a522a6',
                  'html5-babylon/regression.mjs':'af93b32f32a28fb809d059b58c616f226d54733d'}
        ready=all(subprocess.check_output(['git','hash-object',str(root.parent/p)],text=True).strip()==digest for p,digest in approved.items())
    if (name,code)==('0.2.2',202):
        # Explicit owner authorization for progression and real-calendar missions, QA only.
        ready=(root/'qa-progression-authorization.json').read_text().strip()=='{"version":202,"channel":"qa","scope":"progression-missions"}')
print('ready='+str(ready).lower())
