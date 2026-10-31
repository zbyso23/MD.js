bits 16
org 100h
mov ax,40h
mov es,ax
mov bx,[es:006Ch] ; low BIOS tick word
mov ax,4C00h
int 21h

