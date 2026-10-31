bits 16
org 100h
; Inspect BX in debugger after ADD: flags captured by PUSHF/POP.
mov ax,7fffh
add ax,1
pushf
pop bx
; Observe OF=1, SF=1, CF=0; do not depend on undefined bits.
mov ax,4c00h
int 21h
