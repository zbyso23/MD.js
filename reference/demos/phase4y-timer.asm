bits 16
org 100h
mov ah,00h
int 1Ah           ; CX:DX = BIOS timer ticks
mov ax,4c00h
int 21h
