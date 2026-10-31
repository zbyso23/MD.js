bits 16
org 100h
start:
    mov ax,000Dh          ; EGA 320x200, 16 colors
    int 10h
    xor dx,dx             ; y
.y:
    xor cx,cx             ; x
.x:
    mov ah,0Ch            ; BIOS write pixel
    mov al,cl
    shr al,1
    shr al,1
    and al,0Fh           ; 16 color indices
    xor bh,bh             ; display page 0
    int 10h
    inc cx
    cmp cx,320
    jb .x
    inc dx
    cmp dx,200
    jb .y
    ; Change EGA logical palette register 1
    mov ax,1000h
    mov bl,1
    mov bh,3Fh           ; bright EGA color
    int 10h
    xor ah,ah
    int 16h
    mov ax,0003h
    int 10h
    mov ax,4C00h
    int 21h
