#!/usr/bin/env python3
"""Fail closed for consolidated QA release; never expose intermediate builds to OTA."""
import json, pathlib, re
root=pathlib.Path(__file__).resolve().parent
data=json.loads((root/'rc-release-gate.json').read_text())
gradle=(root/'app/build.gradle').read_text()
name=re.search(r"versionName\s+'([^']+)'",gradle).group(1)
code=int(re.search(r"versionCode\s+(\d+)",gradle).group(1))
required={'inventory','economy','construction','residence','agriculture','nature','animals','character','progression','audio','integrity'}
ready=(data.get('schema')==1 and name==data.get('target') and code==data.get('versionCode') and
       data.get('publish') is True and data.get('physicalValidation') is True and
       set(data.get('workstreams',{}))==required and all(v=='approved' for v in data['workstreams'].values()))
print('ready='+str(ready).lower())
