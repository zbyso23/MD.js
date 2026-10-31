#!/usr/bin/env python3
"""Make an 8086-friendly FreeDOS developer floppy out of the supplied 720K FAT12 disk.
Preserves boot sector, FAT, directory layout; updates only config and autoexec payloads,
then validates allocated size and FAT chains. DEBUG.COM is already in this image.
"""
from pathlib import Path
import struct
HERE=Path(__file__).resolve().parent
src=HERE/'x86BOOT-720K-DEBUG.img'; data=bytearray(src.read_bytes())
bps=struct.unpack_from('<H',data,11)[0];spc=data[13];reserved=struct.unpack_from('<H',data,14)[0];fat_count=data[16];entries=struct.unpack_from('<H',data,17)[0];spf=struct.unpack_from('<H',data,22)[0]
root_b=(reserved+fat_count*spf)*bps
root_sectors=(entries*32+bps-1)//bps
data_b=(reserved+fat_count*spf+root_sectors)*bps
fat=data[reserved*bps:(reserved+spf)*bps]

def next_cluster(n):
 p=n*3//2
 return ((fat[p]>>4)|(fat[p+1]<<4))&0xfff if n&1 else (fat[p]|((fat[p+1]&15)<<8))&0xfff

def write_file(name, content):
 b=content.encode('ascii')
 for i in range(entries):
  p=root_b+i*32
  if data[p:p+11] != name: continue
  c=struct.unpack_from('<H',data,p+26)[0]; chain=[]
  while 2<=c<0xff8:
   if c in chain:raise ValueError('FAT loop')
   chain.append(c);c=next_cluster(c)
  cap=len(chain)*spc*bps
  if len(b)>cap:raise ValueError(f'{name}: new payload {len(b)} > capacity {cap}')
  full=b.ljust(cap,b'\x00')
  for n,c in enumerate(chain): data[data_b+(c-2)*spc*bps:data_b+(c-1)*spc*bps]=full[n*spc*bps:(n+1)*spc*bps]
  struct.pack_into('<I',data,p+28,len(b))
  print(name, 'length',len(b),'allocated',cap,'chain',chain)
  return
 raise KeyError(name)

write_file(b'FDCONFIGSYS', '!FILES=30\r\n!BUFFERS=10\r\nSHELL=\\FREEDOS\\BIN\\COMMAND.COM \\FREEDOS\\BIN /E:1024 /P=\\FDAUTO.BAT\r\n')
write_file(b'FDAUTO  BAT', '@ECHO OFF\r\nSET PATH=A:\\FREEDOS\\BIN\r\nPROMPT $P$G\r\nECHO MD.js Ultra XT/Hercules Developer Boot\r\nECHO DEBUG.COM is ready at A:\\DEBUG.COM\r\n')
# Give the user-supplied DEBUG.COM a valid FAT12 timestamp (23 Oct 2026 09:40).
for i in range(entries):
 p=root_b+i*32
 if data[p:p+11]==b'DEBUG   COM':
  d=((2026-1980)<<9)|(10<<5)|23
  t=(9<<11)|(40<<5)
  struct.pack_into('<HH',data,p+22,t,d)
  break
dst=HERE/'x86BOOT-720K-DEBUG-DEV.img'; dst.write_bytes(data)
print(dst,len(data))
