bits 16
org 100h
mov ax,3508h
int 21h
; ES:BX -> INT 08 handler
mov ax,4C00h
int 21h

