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
        ready=(root/'qa-progression-authorization.json').read_text().strip()=='{"version":202,"channel":"qa","scope":"progression-missions"}'
    if (name,code)==('0.2.3',203):
        ready=(root/'qa-progression-authorization.json').read_text().strip()=='{"version":203,"channel":"qa","scope":"progression-ui-regional"}'
    if (name,code)==('0.2.4',204):
        ready=(root/'qa-progression-authorization.json').read_text().strip()=='{"version":204,"channel":"qa","scope":"eight-world-refinements"}'
elif ref=='refs/heads/qa/lote-final-025' and (name,code)==('0.2.5',205):
    # QA testing only. Permit the original release-control commit or its exact
    # corrective child, with gameplay bytes unchanged and full CI required.
    validated='ed7bdab1a6038e0f59886668dcaed85a4e2c4757'
    previous='845f524a7abf779733e27f58aed0cb26cb8d39ed'
    allowed=['html5-babylon/regression.mjs','android-test/rc-release-gate.py','android-test/test-qa-release-gate.py','.github/workflows/babylon-residence.yml','CONTEXTO_E_MEMORIA/ESTADO.md']
    try:
        cwd=root.parent
        parent=subprocess.check_output(['git','rev-parse','HEAD^'],cwd=cwd,text=True,stderr=subprocess.DEVNULL).strip()
        changes=subprocess.check_output(['git','diff','--name-only',validated,'HEAD'],cwd=cwd,text=True,stderr=subprocess.DEVNULL).splitlines()
        clean=subprocess.run(['git','diff','--quiet','HEAD','--'],cwd=cwd,stderr=subprocess.DEVNULL).returncode==0
        ready=(parent in {validated,previous} and clean and bool(changes) and set(changes)<=set(allowed))
    except (OSError,subprocess.CalledProcessError):
        ready=False
elif ref=='refs/heads/qa/lote-final-025' and (name,code)==('0.2.6',206):
    # Scope explicitly approved for an experimental physical test after all CI gates.
    try:
        base='89d09e1c211775ca37850679b8159af7fedc39ac'
        ready=(subprocess.run(['git','merge-base','--is-ancestor',base,'HEAD'],cwd=root.parent,stderr=subprocess.DEVNULL).returncode==0 and
               (root/'qa-206-authorization.json').read_text().strip()=='{"version":206,"channel":"qa","scope":"direct-resource-actions-fishing-atlas"}')
    except (OSError,subprocess.CalledProcessError):
        ready=False
elif ref=='refs/heads/qa/lote-final-025' and (name,code)==('0.2.7',207):
    try:
        ready=(subprocess.run(['git','merge-base','--is-ancestor','8c21c96f81c57e05a3288a82e5c7dd895d262911','HEAD'],cwd=root.parent,stderr=subprocess.DEVNULL).returncode==0 and
               (root/'qa-207-authorization.json').read_text().strip()=='{"version":207,"channel":"qa","scope":"species-seedlings-free-ground"}')
    except (OSError,subprocess.CalledProcessError):
        ready=False
print('ready='+str(ready).lower())
