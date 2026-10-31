bits 16
org 100h
xor ah,ah
xor dl,dl       ; floppy A:
int 13h
jc failed        ; CF=1 means BIOS error
mov ax,4c00h
int 21h
failed:
mov ax,4c01h
int 21h
