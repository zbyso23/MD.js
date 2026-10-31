bits 16
org 100h
mov bx,0
mov cx,1
mov dx,buffer
mov ah,3Fh
int 21h
jc read_error
jmp read_done
read_error:
read_done:
mov ax,4C00h
int 21h
buffer db 0
