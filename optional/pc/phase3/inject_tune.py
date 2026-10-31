#!/usr/bin/env python3
"""Inject source-built TUNE.COM in a 720K FAT12 FreeDOS image.
No automatic changes to other DOS files. Verifies both FAT copies and
reconstructs the exact file payload from the resulting cluster chain.
"""
from pathlib import Path
import struct
import sys
root=Path(__file__).resolve().parent.parent
img=root/'x86BOOT-720K-DEBUG-DEV.img'
payload=(root/'phase3/TUNE.COM').read_bytes()
b=bytearray(img.read_bytes())
assert len(b)==720*1024 and b[510:512]==b'\x55\xaa'
bps=struct.unpack_from('<H',b,11)[0]; spc=b[13]; reserved=struct.unpack_from('<H',b,14)[0]
fats=b[16]; entries=struct.unpack_from('<H',b,17)[0]; spf=struct.unpack_from('<H',b,22)[0]
assert bps==512 and fats==2 and spc>=1 and spf>0
fat0=reserved*bps; root0=(reserved+fats*spf)*bps
rootsectors=(entries*32+bps-1)//bps
data0=(reserved+fats*spf+rootsectors)*bps
clusters=(len(b)-data0)//(bps*spc)
assert b[fat0:fat0+spf*bps]==b[fat0+spf*bps:fat0+2*spf*bps], 'FAT copies differ before modification'
name=b'TUNE    COM'
entry=None
for i in range(entries):
  q=root0+32*i
  if b[q:q+11]==name: entry=q;break
  if entry is None and b[q] in (0,0xe5):entry=q
if b[entry:entry+11]==name:raise SystemExit('TUNE.COM already present; refusing to overwrite')
def getfat(k):
  p=fat0+3*k//2
  return ((b[p]>>4)|(b[p+1]<<4))&0xfff if k&1 else (b[p]|((b[p+1]&15)<<8))&0xfff
def putfat(base,k,v):
  p=base+3*k//2
  if k&1:b[p]=(b[p]&0x0f)|((v&0xf)<<4);b[p+1]=(v>>4)&0xff
  else:b[p]=v&255;b[p+1]=(b[p+1]&0xf0)|((v>>8)&0xf)
needed=(len(payload)+spc*bps-1)//(spc*bps)
free=[k for k in range(2,clusters+2) if getfat(k)==0]
assert len(free)>=needed,'Not enough free FAT12 clusters'
chain=free[:needed]
for n,k in enumerate(chain):
  value=chain[n+1] if n+1<len(chain) else 0xfff
  for f in range(fats):putfat(fat0+f*spf*bps,k,value)
  start=data0+(k-2)*spc*bps
  b[start:start+spc*bps]=payload[n*spc*bps:(n+1)*spc*bps].ljust(spc*bps,b'\0')
entrybuf=bytearray(32);entrybuf[:11]=name;entrybuf[11]=0x20
# 24 October 2026, 00:30 FAT local timestamp
struct.pack_into('<H',entrybuf,22,(0<<11)|(30<<5))
struct.pack_into('<H',entrybuf,24,((2026-1980)<<9)|(10<<5)|24)
struct.pack_into('<H',entrybuf,26,chain[0]);struct.pack_into('<I',entrybuf,28,len(payload))
b[entry:entry+32]=entrybuf
assert b[fat0:fat0+spf*bps]==b[fat0+spf*bps:fat0+2*spf*bps]
assert b[data0+(chain[0]-2)*spc*bps:data0+(chain[0]-2)*spc*bps+len(payload)]==payload
img.write_bytes(b)
print('Injected TUNE.COM',len(payload),'bytes, FAT12 clusters',chain,'directory entry',hex(entry))
