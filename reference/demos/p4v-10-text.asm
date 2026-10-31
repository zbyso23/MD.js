bits 16
org 100h
mov ax,0003h
int 10h
mov ah,0Eh
mov al,41h
mov bx,0007h
int 10h
mov ax,4C00h
int 21h

