bits 16
org 100h
; CGA/compatible VGA color status: 3DAh bit 3 = vertical retrace.
mov ax,0013h
int 10h
mov ax,0A000h
mov es,ax
xor di,di
xor bx,bx
frame:
    mov dx,03DAh
wait_end:
    in al,dx
    test al,08h
    jnz wait_end
wait_start:
    in al,dx
    test al,08h
    jz wait_start
    xor di,di
    mov cx,320*200
    mov al,bl
    rep stosb
    inc bl
    mov ah,01h
    int 16h
    jz frame
    xor ah,ah
    int 16h
    mov ax,0003h
    int 10h
    mov ax,4C00h
    int 21h
