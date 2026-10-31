#!/usr/bin/env python3
"""Development-only FAT12 insert of VGA12/13.COM in PERSONAL FreeDOS copy.
Does not alter user-provided originals outside the current project directory.
"""
from pathlib import Path
import re, base64
PC=Path(__file__).resolve().parents[1]
img=PC/'x86BOOT-720K-DEBUG-DEV.img'
data=bytearray(img.read_bytes())
if len(data)!=737280 or data[510:512]!=b'\x55\xaa':raise SystemExit('Invalid 720K FAT12 image')
bps=int.from_bytes(data[11:13],'little');spc=data[13];reserved=int.from_bytes(data[14:16],'little')
fats=data[16];spf=int.from_bytes(data[22:24],'little');root_entries=int.from_bytes(data[17:19],'little')
fatstart=reserved*bps;fatsize=spf*bps;root=(reserved+fats*spf)*bps
rootsec=(root_entries*32+bps-1)//bps;start=(reserved+fats*spf+rootsec)*bps
cluster_bytes=bps*spc;count=(len(data)-start)//cluster_bytes
fat=bytearray(data[fatstart:fatstart+fatsize])
def get(k):
 p=k+k//2
 return ((fat[p]>>4)|(fat[p+1]<<4))&4095 if k&1 else (fat[p]|((fat[p+1]&15)<<8))&4095
def put(k,val):
 p=k+k//2
 if k&1:fat[p]=(fat[p]&15)|((val&15)<<4);fat[p+1]=(val>>4)&255
 else:fat[p]=val&255;fat[p+1]=(fat[p+1]&240)|((val>>8)&15)
for filename in ('VGA13.COM','VGA12.COM'):
 content=(PC/'phase4'/filename).read_bytes()
 if not content or len(content)>cluster_bytes:raise SystemExit('Demo too large for one cluster')
 name=filename.split('.')[0].ljust(8).encode()+b'COM'
 if any(data[root+i*32:root+i*32+11]==name for i in range(root_entries)):raise SystemExit('Already installed: '+filename)
 cluster=next((i for i in range(2,count+2) if get(i)==0),None)
 slot=next((root+i*32 for i in range(root_entries) if data[root+i*32] in (0,229)),None)
 if cluster is None or slot is None:raise SystemExit('FAT12 disk full')
 put(cluster,0xfff)
 off=start+(cluster-2)*cluster_bytes;data[off:off+len(content)]=content
 data[slot:slot+32]=bytes(32)
 data[slot:slot+11]=name;data[slot+11]=0x20
 data[slot+22:slot+24]=(0).to_bytes(2,'little')
 data[slot+24:slot+26]=((2026-1980)<<9|10<<5|24).to_bytes(2,'little')
 data[slot+26:slot+28]=cluster.to_bytes(2,'little')
 data[slot+28:slot+32]=len(content).to_bytes(4,'little')
 print(filename,'installed, cluster',cluster,'bytes',len(content))
for index in range(fats):
 off=fatstart+index*fatsize;data[off:off+fatsize]=fat
assert data[fatstart:fatstart+fatsize]==data[fatstart+fatsize:fatstart+2*fatsize]
img.write_bytes(data)
assets=PC/'PC-EmbeddedAssets.js'
s=assets.read_text()
new='freedos720kDebug:"'+base64.b64encode(data).decode('ascii')+'"'
s,found=re.subn(r'freedos720kDebug:"[A-Za-z0-9+/=]+"',lambda m:new,s,count=1)
if found!=1:raise SystemExit('Embedded asset field missing')
assets.write_text(s)
print('FAT copies and embedded image synchronized')
