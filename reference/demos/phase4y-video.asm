bits 16
org 100h
mov ah,0Eh
mov al,'*'
int 10h
mov ax,4c00h
int 21h
