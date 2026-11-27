#!/usr/bin/env python3
"""Recover ONLY approved branding from the immutable public original APK.
No network requests are made by the game. A missing asset fails the build."""
import base64, hashlib, io, pathlib, struct, sys, urllib.request, zipfile
from PIL import Image

URL = "https://raw.githubusercontent.com/efgjfmanoh-del/Colheita-Vitural-Updates/f36a4ef9cf85e3fb9ea091f2eed17d58e7dacf2e/v2/v4.9.30/ColheitaVitural.apk"
APK_BLOB = "ae7b533439849985773b8f036026c909c14c7c66"
ORIGINAL_LOGO = "3a5d9d132de4f6d9f73a55e02532f705924aaff938fc35909efb2027cf649d60"
DIST = pathlib.Path("dist")

def sha(data):
    return hashlib.sha256(data).hexdigest()

def download():
    req = urllib.request.Request(URL, headers={"User-Agent":"Colheita-Vitural-brand-recovery"})
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = resp.read(70_000_001)
    assert len(data) == 64542604, "Unexpected original APK size"
    git_hash = hashlib.sha1(("blob "+str(len(data))+"\0").encode()+data).hexdigest()
    assert git_hash == APK_BLOB, "Original APK blob hash mismatch"
    return data

def pck_entries(data):
    # Godot 4 PCK v2: offsets relative to file_base, optional directory encryption.
    if data[:4] != b"GDPC" or len(data)<100: return {}
    ver,major,minor,patch,flags,base = struct.unpack_from("<IIIIIQ",data,4)
    if ver!=2 or flags&1: return {}
    off=96
    count=struct.unpack_from("<I",data,off)[0];off+=4
    if count>200000: raise ValueError("PCK entry count")
    out={}
    for _ in range(count):
        n=struct.unpack_from("<I",data,off)[0];off+=4
        if n>65536 or off+n+36>len(data): raise ValueError("PCK directory")
        name=data[off:off+n].rstrip(b"\0").decode("utf-8");off+=n
        pos,size=struct.unpack_from("<QQ",data,off);off+=32
        entry_flags=struct.unpack_from("<I",data,off)[0];off+=4
        if not entry_flags&1 and pos+base+size<=len(data):
            out[name]=data[base+pos:base+pos+size]
    return out

def image_from_blob(data):
    # Godot lossless compressed textures may wrap a PNG or a RIFF/WEBP payload.
    offsets={0}
    for sig in (b"\x89PNG\r\n\x1a\n",b"RIFF",b"\xff\xd8\xff"):
        i=data.find(sig)
        if i>=0: offsets.add(i)
    for i in sorted(offsets):
        try:
            with Image.open(io.BytesIO(data[i:])) as im:
                im.load()
                return im.copy()
        except Exception: pass
    raise ValueError("No decodable image payload")

def candidates(entries, token):
    return [(name,data) for name,data in entries.items()
            if token in name.lower() and name.lower().endswith((".png",".jpg",".jpeg",".webp",".ctex"))]

def approved(entries, token, logo=False):
    matches=candidates(entries,token)
    # Prefer raw bytes over imported textures.
    matches.sort(key=lambda item: item[0].endswith(".ctex"))
    for name,data in matches:
        try: im=image_from_blob(data)
        except ValueError: continue
        w,h=im.size
        if logo and (w,h)!=(2172,724): continue
        if not logo and (w<640 or w/h<1.2): continue
        print("BRAND_SOURCE",name,im.size,sha(data))
        if logo and name.lower().endswith(".png"):
            assert sha(data)==ORIGINAL_LOGO,"Logo PNG differs from approved original"
        return im
    raise RuntimeError("Approved branding missing or undecodable: "+token)

def png_bytes(im):
    buf=io.BytesIO();im.save(buf,format="PNG",optimize=True);return buf.getvalue()

def jpeg_bytes(im):
    buf=io.BytesIO();im.convert("RGB").save(buf,format="JPEG",quality=90,optimize=True);return buf.getvalue()

def main():
    data=download()
    with zipfile.ZipFile(io.BytesIO(data)) as apk:
        names=apk.namelist()
        entries={name:apk.read(name) for name in names if any(t in name.lower() for t in ("logo_colheita_vitural","menu_farm","ic_colheita"))}
        if not candidates(entries,"logo_colheita_vitural") or not candidates(entries,"menu_farm"):
            for name in names:
                if name.lower().endswith(".pck"):
                    entries.update({k:v for k,v in pck_entries(apk.read(name)).items() if any(t in k.lower() for t in ("logo_colheita_vitural","menu_farm"))})
        logo=approved(entries,"logo_colheita_vitural",True).convert("RGBA")
        farm=approved(entries,"menu_farm")
        # Keep the exact original launcher if it is present, otherwise reproduce
        # the original 512px composition from the approved source artwork.
        icon=None
        for name,raw in candidates(entries,"ic_colheita"):
            try:
                candidate=image_from_blob(raw)
                if candidate.size==(512,512):
                    icon=candidate.convert("RGBA");print("BRAND_ICON_SOURCE",name,sha(raw));break
            except ValueError: pass
        if icon is None:
            from math import hypot
            crop=logo.crop(logo.getbbox());height=max(1,round(476*crop.height/crop.width))
            assert height<=476
            icon=Image.new("RGBA",(512,512));px=icon.load()
            for y in range(512):
                for x in range(512):
                    d=min(1,hypot(x-255.5,y-255.5)/362)
                    px[x,y]=tuple(round(a+(b-a)*d) for a,b in zip((73,99,73,255),(26,44,32,255)))
            icon.alpha_composite(crop.resize((476,height),Image.Resampling.LANCZOS),(18,(512-height)//2))
        # UI uses local embedded images; no WebView networking or URL changes.
        logo.thumbnail((1300,500),Image.Resampling.LANCZOS);farm.thumbnail((1920,1200),Image.Resampling.LANCZOS)
        html=(DIST/"index.html").read_text()
        for marker,mime,raw in [("__CV_LOGO_DATA__","image/png",png_bytes(logo)),("__CV_FARM_DATA__","image/jpeg",jpeg_bytes(farm))]:
            assert html.count(marker)==1,marker
            html=html.replace(marker,"data:"+mime+";base64,"+base64.b64encode(raw).decode())
        (DIST/"index.html").write_text(html)
        (DIST/"brand-launcher.png").write_bytes(png_bytes(icon))
        print("BRAND_OK",logo.size,farm.size,icon.size,sha((DIST/"brand-launcher.png").read_bytes()))

if __name__=="__main__": main()
