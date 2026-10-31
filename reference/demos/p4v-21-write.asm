bits 16
org 100h
mov bx,1
mov cx,msg_end-msg
mov dx,msg
mov ah,40h
int 21h
mov ax,4C00h
int 21h
msg db "Hello from handle",13,10
msg_end:
