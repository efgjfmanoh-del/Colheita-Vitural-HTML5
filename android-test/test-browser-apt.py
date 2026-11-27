import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('apt',Path(__file__).with_name('prepare-browser-apt.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
official='deb http://archive.ubuntu.com/ubuntu noble main\n'
ms='deb [arch=amd64 signed-by=/etc/apt/keyrings/microsoft.gpg] https://packages.microsoft.com/ubuntu/24.04/prod noble main\n'
assert m.clean_list(official+ms)==official+'# CI: unnecessary Microsoft feed disabled: '+ms
mixed='Types: deb\nURIs: https://packages.microsoft.com/ubuntu/24.04/prod https://archive.ubuntu.com/ubuntu\nSuites: noble\nSigned-By: /etc/apt/keyrings/test.gpg\n'
assert m.clean_sources(mixed)==mixed.replace('https://packages.microsoft.com/ubuntu/24.04/prod ','')
ubuntu='Types: deb\nURIs: http://security.ubuntu.com/ubuntu\nSuites: noble-security\n'
only='Types: deb\nURIs: https://packages.microsoft.com/ubuntu/24.04/prod\nSuites: noble\n'
out=m.clean_sources(ubuntu+'\n'+only)
assert out.startswith(ubuntu+'\n# CI: Types: deb')
assert m.clean_sources(out)==out
assert m.clean_list(m.clean_list(official+ms))==m.clean_list(official+ms)
assert not m.microsoft('https://packages.microsoft.com.example.org/a')
print('PASS: only Microsoft feed disabled; official sources and signature configuration preserved')
