bits 16
org 100h
; AdLib OPL2: ASDFGHJ / ZXCVBN piano notes; Esc exits.
; Designed for actual AdLib-compatible I/O at 388h/389h.
mov ax,cs
mov ds,ax
mov dx,0388h
mov al,20h
mov ah,01h
call opl_write
mov al,23h
mov ah,01h
call opl_write
mov al,40h
mov ah,3fh
call opl_write
mov al,43h
mov ah,00h
call opl_write
mov al,60h
mov ah,0f0h
call opl_write
mov al,63h
mov ah,0f0h
call opl_write
mov al,80h
mov ah,077h
call opl_write
mov al,83h
mov ah,077h
call opl_write
mov al,0c0h
mov ah,01h
call opl_write
readkey:
 xor ah,ah
 int 16h
 cmp al,27
 je exit
 ; note table mapped to ASCII keys (uppercase folded to lowercase)
 or al,20h
 mov si,keys
 mov cx,keycount
search:
 cmp al,[si]
 je play
 inc si
 loop search
 jmp readkey
play:
 mov bx,si
 sub bx,keys
 shl bx,1
 mov si,notes
 add si,bx
 mov bx,[si]
 mov al,0b0h
 xor ah,ah
 call opl_write ; key off
 mov al,0a0h
 mov ah,bl
 call opl_write
 mov al,0b0h
 mov ah,bh
 or ah,20h
 call opl_write
 jmp readkey
exit:
 mov al,0b0h
 xor ah,ah
 call opl_write
 mov ax,4c00h
 int 21h
; AL=OPL register, AH=value. DX=388h. Preserves AX, CX, DX.
opl_write:
 push ax
 push cx
 push dx
 out dx,al
 mov cx,6
.delay1: in al,dx
 loop .delay1
 inc dx
 mov al,ah
 out dx,al
 dec dx
 mov cx,35
.delay2: in al,dx
 loop .delay2
 pop dx
 pop cx
 pop ax
 ret
keys db 'asdfghjzxcvbn'
keycount equ $-keys
; F-NUM low, block/high in OPL B0 register.
notes dw 01159h,01183h,011b3h,011cch,01205h,01244h,0128bh
      dw 01559h,01583h,015b3h,015cch,01605h,01644h
