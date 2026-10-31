bits 16
org 100h
start:
    push cs
    pop ds
    mov ax,0013h
    int 10h                 ; VGA 320x200x256
    mov ax,0A000h
    mov es,ax
    xor di,di
    xor bx,bx                ; y
.row:
    mov cx,320
    mov al,bl
.pixel:
    stosb                   ; palette index = (x+y) mod 256
    inc al
    loop .pixel
    inc bx
    cmp bx,200
    jb .row
    xor si,si                ; animated phase
.next_frame:
    mov dx,03C8h
    xor al,al
    out dx,al               ; DAC starting at index zero
    inc dx                  ; 3C9h DAC data
    xor bx,bx
.palette:
    mov ax,bx
    add ax,si
    and al,63               ; red: 0..63
    out dx,al
    mov ax,bx
    add ax,si
    shr al,1
    and al,63               ; green
    out dx,al
    mov ax,bx
    sub ax,si
    and al,63               ; blue
    out dx,al
    inc bx
    cmp bx,256
    jb .palette
    inc si
    mov ah,01h
    int 16h                 ; key pending?
    jz .next_frame
    xor ah,ah
    int 16h                 ; consume key
    mov ax,0003h
    int 10h
    mov ax,4C00h
    int 21h
