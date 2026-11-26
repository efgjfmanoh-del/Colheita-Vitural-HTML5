#!/usr/bin/env python3
"""Generate manifest exclusively from verified QA artifact."""
import hashlib, json, pathlib, re, sys
CERT="fdefa3921fb2e0010e5f4a677589a7f8f8a450738626caab4c97dc7ad25f6f21"
PACKAGE="br.com.colheitavitural.html5.qa"
def build(folder):
    root=pathlib.Path(folder)
    apk=root/"ColheitaVitural-QA.apk"
    badging=(root/"badging.txt").read_text()
    sig=(root/"signature.txt").read_text().splitlines()
    m=re.search(r"package: name='([^']+)' versionCode='([0-9]+)' versionName='([^']+)'",badging)
    if not m or m.group(1)!=PACKAGE or int(m.group(2))<109 or not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+",m.group(3)):
        raise ValueError("Wrong QA package/version")
    if f"Signer #1 certificate SHA-256 digest: {CERT}" not in sig or "Verified using v2 scheme (APK Signature Scheme v2): true" not in sig or "Number of signers: 1" not in sig:
        raise ValueError("Wrong signer")
    data=apk.read_bytes()
    digest=hashlib.sha256(data).hexdigest()
    if (root/"SHA256SUMS.txt").read_text().split()[0]!=digest or not 0<len(data)<=512*1024*1024:
        raise ValueError("APK integrity")
    result={"package":PACKAGE,"versionCode":int(m.group(2)),"versionName":m.group(3),"file":apk.name,"size":len(data),"sha256":digest,"certificateSha256":CERT}
    (root/"update.json").write_text(json.dumps(result,indent=2)+"\n")
    return result
if __name__=="__main__":
    x=build(sys.argv[1])
    print(f"qa-v{x['versionCode']}")
