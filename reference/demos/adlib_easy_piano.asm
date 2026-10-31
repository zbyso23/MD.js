bits 16
org 100h
start:
    push cs
    pop ds
    ; Simple two-operator instrument on channel 0
    mov bl,020h
    mov al,001h
    call opl_write
    mov bl,023h
    mov al,001h
    call opl_write
    mov bl,040h
    mov al,03Fh
    call opl_write
    mov bl,043h
    mov al,000h
    call opl_write
    mov bl,060h
    mov al,0F0h
    call opl_write
    mov bl,063h
    mov al,0F0h
    call opl_write
    mov bl,080h
    mov al,077h
    call opl_write
    mov bl,083h
    mov al,077h
    call opl_write
    mov bl,0C0h
    xor al,al
    call opl_write
key_loop:
    xor ah,ah
    int 16h
    cmp al,27          ; ESC
    je done
    and al,0DFh       ; uppercase
    cmp al,'A'
    je note_c
    cmp al,'S'
    je note_d
    cmp al,'D'
    je note_e
    cmp al,'F'
    je note_f
    cmp al,'G'
    je note_g
    jmp key_loop
note_c: mov ax,0157h
    jmp play
note_d: mov ax,0181h
    jmp play
note_e: mov ax,01B0h
    jmp play
note_f: mov ax,01CAh
    jmp play
note_g: mov ax,0202h
play:
    push ax
    mov bl,0B0h
    mov al,011h        ; key off, block 4
    call opl_write
    pop ax
    push ax
    mov bl,0A0h
    call opl_write     ; FNUM low
    pop ax
    mov cl,8
    shr ax,cl
    and al,3
    or al,030h        ; key on + block 4
    mov bl,0B0h
    call opl_write
    jmp key_loop
done:
    mov bl,0B0h
    xor al,al
    call opl_write
    mov ax,4C00h
    int 21h
; BL = register; AL = value. OPL2 port delays via reads.
opl_write:
    push ax
    push cx
    push dx
    mov ah,al           ; save value
    mov dx,0388h
    mov al,bl
    out dx,al           ; register index
    mov cx,6
.wait1: in al,dx
    loop .wait1
    inc dx              ; data port 389h
    mov al,ah
    out dx,al
    dec dx
    mov cx,35
.wait2: in al,dx
    loop .wait2
    pop dx
    pop cx
    pop ax
    ret
