#!/usr/bin/env python3
"""Authorize only the exact maintenance build or the fully validated consolidated RC."""
import json, pathlib, re, os
root=pathlib.Path(__file__).resolve().parent
gradle=(root/'app/build.gradle').read_text()
name=re.search(r"versionName\s+'([^']+)'",gradle).group(1)
code=int(re.search(r"versionCode\s+(\d+)",gradle).group(1))
ref=os.environ.get('GITHUB_REF','')
required={'inventory','economy','construction','residence','agriculture','nature','animals','character','progression','audio','integrity'}
ready=False
if ref=='refs/heads/qa/0.1.51':
    ready=(name=='0.1.51' and code==151 and not (root/'rc-release-gate.json').exists())
elif ref=='refs/heads/main':
    data=json.loads((root/'rc-release-gate.json').read_text())
    ready=(data.get('schema')==1 and name=='0.2.0' and code==200 and name==data.get('target') and code==data.get('versionCode') and
           data.get('publish') is True and data.get('physicalValidation') is True and
           set(data.get('workstreams',{}))==required and all(v=='approved' for v in data['workstreams'].values()))
print('ready='+str(ready).lower())
