bits 16
org 100h
xor ah,ah
int 16h
; AL ASCII, AH scan
mov ax,4C00h
int 21h

