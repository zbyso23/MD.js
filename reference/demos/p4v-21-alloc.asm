bits 16
org 100h
mov ah,48h
mov bx,10h
int 21h
jc no_memory
mov es,ax
mov ah,49h
int 21h ; free ES
no_memory:
mov ax,4C00h
int 21h

