#!/usr/bin/env python3
"""Exclude the unrelated Microsoft package feed on disposable Ubuntu CI runners.
Never bypass APT signature checks or disable Ubuntu security repositories.
"""
import pathlib, re, sys
from urllib.parse import urlsplit

def microsoft(uri):
    return urlsplit(uri).hostname == 'packages.microsoft.com'

def clean_list(text):
    result=[]
    for line in text.splitlines(keepends=True):
        match=re.match(r'^\s*deb(?:-src)?\s+(?:\[[^\]]*\]\s+)?(https?://\S+)',line)
        result.append('# CI: unnecessary Microsoft feed disabled: '+line if match and microsoft(match.group(1)) else line)
    return ''.join(result)

def clean_sources(text):
    parts=re.split(r'(\n[ \t]*\n)',text)
    for i in range(0,len(parts),2):
        block=parts[i]
        match=re.search(r'^URIs:[ \t]*([^\n]*(?:\n[ \t]+[^\n]*)*)',block,re.M|re.I)
        if not match: continue
        uris=match.group(1).split()
        keep=[uri for uri in uris if not microsoft(uri)]
        if len(keep)==len(uris): continue
        if keep:
            parts[i]=block[:match.start()]+'URIs: '+' '.join(keep)+block[match.end():]
        else:
            parts[i]='\n'.join('# CI: '+line if line else line for line in block.split('\n'))
    return ''.join(parts)

def main():
    if '--apply' not in sys.argv: raise SystemExit('Explicit --apply required on disposable CI runner')
    root=pathlib.Path('/etc/apt')
    for path in [root/'sources.list',*(root/'sources.list.d').glob('*.list'),*(root/'sources.list.d').glob('*.sources')]:
        if not path.is_file(): continue
        old=path.read_text()
        new=(clean_sources if path.suffix=='.sources' else clean_list)(old)
        if new!=old:
            path.write_text(new)
            print('Disabled unrelated Microsoft source in',path)
if __name__=='__main__': main()
