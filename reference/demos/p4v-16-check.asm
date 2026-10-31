bits 16
org 100h
mov ah,01h
int 16h
jz no_key
xor ah,ah
int 16h
no_key:
mov ax,4C00h
int 21h

