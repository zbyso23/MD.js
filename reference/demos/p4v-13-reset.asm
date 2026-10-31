bits 16
org 100h
mov ah,00h
mov dl,80h
int 13h
mov ax,4C00h
int 21h

