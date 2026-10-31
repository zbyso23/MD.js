bits 16
org 100h
mov ax,cs
mov es,ax
mov bx,buffer
mov ax,0201h
mov cx,0001h
xor dh,dh
mov dl,00h
int 13h
; CF must be checked in real code
mov ax,4C00h
int 21h
buffer: times 512 db 0
