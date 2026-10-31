bits 16
org 100h
mov ah,02h
mov dl,42h
int 21h
mov ax,4C00h
int 21h

