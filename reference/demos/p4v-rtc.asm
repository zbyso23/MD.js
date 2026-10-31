bits 16
org 100h
mov ah,02h
int 1Ah
jc no_rtc
no_rtc:
mov ax,4C00h
int 21h

