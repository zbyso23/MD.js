bits 16
org 100h
start:
    mov ax,0012h         ; VGA 640x480x16
    int 10h
    xor dx,dx            ; y
.y:
    xor cx,cx            ; x
.x:
    mov ah,0Ch
    mov al,cl
    shr al,1
    shr al,1
    and al,0Fh
    xor bh,bh
    int 10h
    add cx,4              ; sparse stripes for speed
    cmp cx,640
    jb .x
    inc dx
    cmp dx,480
    jb .y
    ; VGA DAC palette entry #1 -> cyan
    mov dx,03C8h
    mov al,1
    out dx,al
    mov dx,03C9h
    xor al,al
    out dx,al            ; red
    mov al,63
    out dx,al            ; green
    out dx,al            ; blue
    xor ah,ah
    int 16h
    mov ax,0003h
    int 10h
    mov ax,4C00h
    int 21h
