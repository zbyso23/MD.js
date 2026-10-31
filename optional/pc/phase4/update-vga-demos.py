#!/usr/bin/env python3
"""Update VGA demonstration binaries on the development FAT12 image in-place.
Preserve all other clusters, directory entries, personal DEBUG/TUNE/MANDEL.
Re-embed the exact resulting image for offline file:// operation.
"""
from pathlib import Path
import base64,re
PC=Path(__file__).resolve().parents[1]
img=PC/'x86BOOT-720K-DEBUG-DEV.img';disk=bytearray(img.read_bytes())
assert len(disk)==737280 and disk[510:512]==b'\x55\xaa'
bps=int.from_bytes(disk[11:13],'little');spc=disk[13]
reserved=int.from_bytes(disk[14:16],'little');nf=disk[16]
spf=int.from_bytes(disk[22:24],'little');ne=int.from_bytes(disk[17:19],'little')
fs=reserved*bps;size=spf*bps;root=(reserved+nf*spf)*bps
sectors=(ne*32+bps-1)//bps;first=(reserved+nf*spf+sectors)*bps
fat=disk[fs:fs+size]
assert disk[fs:fs+size]==disk[fs+size:fs+size*2]
def get(k):
 p=k+k//2
 return ((fat[p]>>4)|(fat[p+1]<<4))&0xfff if k&1 else (fat[p]|((fat[p+1]&15)<<8))&0xfff
def find(filename):
 name=filename.split('.')[0].ljust(8).encode('ascii')+b'COM'
 for i in range(ne):
  pos=root+i*32
  if disk[pos:pos+11]==name:return pos
 raise ValueError('Missing '+filename)
for filename in ('VGA13.COM','VGA12.COM'):
 entry=find(filename);cluster=int.from_bytes(disk[entry+26:entry+28],'little')
 data=(PC/'phase4'/filename).read_bytes()
 assert 0<len(data)<=bps*spc and get(cluster)>=0xff8
 o=first+(cluster-2)*bps*spc
 disk[o:o+bps*spc]=data.ljust(bps*spc,b'\0')
 disk[entry+28:entry+32]=len(data).to_bytes(4,'little')
 print('Updated',filename,'at cluster',cluster,'bytes',len(data))
assert disk[fs:fs+size]==disk[fs+size:fs+size*2]
img.write_bytes(disk)
p=PC/'PC-EmbeddedAssets.js';s=p.read_text()
s,n=re.subn(r'freedos720kDebug:"[A-Za-z0-9+/=]+"',lambda m:'freedos720kDebug:"'+base64.b64encode(disk).decode('ascii')+'"',s,1)
assert n==1;p.write_text(s)
