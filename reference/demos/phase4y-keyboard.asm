bits 16
org 100h
xor ah,ah
int 16h         ; AL ASCII, AH scan code
mov ax,4c00h
int 21h
