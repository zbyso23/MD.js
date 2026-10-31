#!/usr/bin/env python3
"""Update the existing PERSONAL FAT12 MANDEL.COM and embedded image, without touching other files.
GPL-3.0-only. Assumes the original already contains MANDEL.COM in a single 512-byte cluster.
"""
from pathlib import Path
import base64,re
PC=Path(__file__).resolve().parents[1]
source=PC/'x86BOOT-720K-DEBUG-DEV.img'
program=(PC/'phase4/MANDEL.COM').read_bytes()
data=bytearray(source.read_bytes())
assert len(data)==737280 and data[510:512]==b'\x55\xaa' and 0<len(program)<=512
bps=int.from_bytes(data[11:13],'little');spc=data[13]
reserved=int.from_bytes(data[14:16],'little');fats=data[16]
spf=int.from_bytes(data[22:24],'little');entries=int.from_bytes(data[17:19],'little')
fs=reserved*bps; fsize=spf*bps; root=(reserved+fats*spf)*bps
rs=(entries*32+bps-1)//bps; start=(reserved+fats*spf+rs)*bps
name=b'MANDEL  COM'
found=[root+i*32 for i in range(entries) if data[root+i*32:root+i*32+11]==name]
assert len(found)==1, 'Expected exactly one MANDEL.COM directory entry'
slot=found[0];cluster=int.from_bytes(data[slot+26:slot+28],'little')
fat=data[fs:fs+fsize];index=cluster+cluster//2
value=((fat[index]>>4)|(fat[index+1]<<4)) if cluster&1 else (fat[index]|((fat[index+1]&15)<<8))
assert cluster>=2 and value>=0xff8 and len(program)<=spc*bps, 'Only one-cluster existing MANDEL.COM supported'
offset=start+(cluster-2)*spc*bps
data[offset:offset+spc*bps]=program.ljust(spc*bps,b'\x00')
data[slot+28:slot+32]=len(program).to_bytes(4,'little')
assert data[fs:fs+fsize]==data[fs+fsize:fs+2*fsize], 'FAT mirrors differ'
source.write_bytes(data)
assets=PC/'PC-EmbeddedAssets.js';s=assets.read_text()
new='freedos720kDebug:"'+base64.b64encode(data).decode()+'"'
s,n=re.subn(r'freedos720kDebug:"[A-Za-z0-9+/=]+"',lambda _:new,s,1)
assert n==1,'Embedded image not found';assets.write_text(s)
print('Updated MANDEL.COM',len(program),'bytes cluster',cluster,'and embedded 720K FreeDOS image')
