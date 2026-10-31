bits 16
org 100h
mov dx,msg
mov ah,09h
int 21h
mov ax,4C00h
int 21h
msg db "Hello INT 21h!",13,10,"$"
