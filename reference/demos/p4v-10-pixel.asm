bits 16
org 100h
mov ax,0013h
int 10h
mov ah,0Ch
mov al,0Eh
xor bh,bh
mov cx,160
mov dx,100
int 10h
xor ah,ah
int 16h
mov ax,0003h
int 10h
mov ax,4C00h
int 21h

