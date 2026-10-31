bits 16
org 100h
mov ah,2Ch
int 21h ; instead poll DOS time safely
mov ax,4C00h
int 21h

