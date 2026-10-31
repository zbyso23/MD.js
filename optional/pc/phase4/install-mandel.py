#!/usr/bin/env python3
"""Add 240-byte MANDEL.COM to PERSONAL FreeDOS 720K FAT12 (development-only)."""
from pathlib import Path
import base64,re
PC=Path(__file__).resolve().parents[1]
img=PC/'x86BOOT-720K-DEBUG-DEV.img'
data=bytearray(img.read_bytes());program=(PC/'phase4'/'MANDEL.COM').read_bytes()
assert len(data)==737280 and data[510:512]==b'\x55\xaa' and 0<len(program)<512
bps=int.from_bytes(data[11:13],'little');spc=data[13];reserved=int.from_bytes(data[14:16],'little');fats=data[16];spf=int.from_bytes(data[22:24],'little');root_entries=int.from_bytes(data[17:19],'little')
fs=reserved*bps; fsize=spf*bps;root=(reserved+fats*spf)*bps;rs=(root_entries*32+bps-1)//bps;start=(reserved+fats*spf+rs)*bps;cnt=(len(data)-start)//(bps*spc)
fat=bytearray(data[fs:fs+fsize]);name=b'MANDEL  COM'
def get(k):
 p=k+k//2
 return (((fat[p]>>4)|(fat[p+1]<<4)) if k&1 else (fat[p]|((fat[p+1]&15)<<8)))&4095
def put(k,v):
 p=k+k//2
 if k&1:fat[p]=(fat[p]&15)|((v&15)<<4);fat[p+1]=(v>>4)&255
 else:fat[p]=v&255;fat[p+1]=(fat[p+1]&240)|((v>>8)&15)
assert not any(data[root+i*32:root+i*32+11]==name for i in range(root_entries))
cluster=next(i for i in range(2,cnt+2) if get(i)==0);slot=next(root+i*32 for i in range(root_entries) if data[root+i*32] in (0,229))
put(cluster,0xfff);off=start+(cluster-2)*(bps*spc);data[off:off+len(program)]=program
data[slot:slot+32]=bytes(32);data[slot:slot+11]=name;data[slot+11]=0x20
data[slot+24:slot+26]=(((2026-1980)<<9)|(10<<5)|24).to_bytes(2,'little');data[slot+26:slot+28]=cluster.to_bytes(2,'little');data[slot+28:slot+32]=len(program).to_bytes(4,'little')
for i in range(fats):data[fs+i*fsize:fs+(i+1)*fsize]=fat
assert data[fs:fs+fsize]==data[fs+fsize:fs+2*fsize]
img.write_bytes(data)
assets=PC/'PC-EmbeddedAssets.js';s=assets.read_text();new='freedos720kDebug:"'+base64.b64encode(data).decode()+'"';s,n=re.subn(r'freedos720kDebug:"[A-Za-z0-9+/=]+"',lambda _:new,s,1);assert n==1;assets.write_text(s)
print('FAT12 MANDEL.COM installed, cluster',cluster,'bytes',len(program))
