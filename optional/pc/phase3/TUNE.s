/* TUNE.COM — 16-bit XT/286 FreeDOS melody over Yamaha OPL2 ports.
 * GNU as --32 TUNE.s -o TUNE.o
 * GNU ld -m elf_i386 -Ttext 0x100 --oformat binary -o TUNE.COM TUNE.o
 * GPL-3.0-only. No 386 instructions, no TSR, no runtime assets.
 */
.code16
.intel_syntax noprefix
.section .text
.global _start
_start:
    push cs
    pop ds
    mov si, offset setup
init:
    lodsw                      /* AL=register, AH=value */
    cmp al, 0xff
    je song
    call oplwrite
    jmp init
song:
    mov si, offset notes
next:
    lodsw                      /* AL=F-number low, AH=B0 key-on */
    cmp ax, 0xffff
    je finish
    push ax
    mov ah, al
    mov al, 0xa0
    call oplwrite
    pop ax
    mov al, 0xb0
    call oplwrite
    mov di, 10                /* Slow, legible duration via BIOS ticks */
    call waitticks
    mov ax, 0x00b0            /* Key off (channel 0) */
    call oplwrite
    mov di, 2                 /* Distinct pauses between notes */
    call waitticks
    jmp next
finish:
    mov ax, 0x00b0
    call oplwrite
    mov ax, 0x4c00
    int 0x21
oplwrite:
    push dx
    push ax
    mov dx, 0x0388
    out dx, al                /* YM3812 register latch */
    inc dx
    mov al, ah
    out dx, al                /* YM3812 data */
    pop ax
    pop dx
    ret
waitticks:
    mov ah, 0
    int 0x1a                  /* BIOS read clock CX:DX */
    mov bp, dx
wait_loop:
    mov ah, 0
    int 0x1a
    sub dx, bp
    cmp dx, di
    jb wait_loop
    ret
setup:
    .byte 0x01,0x20, 0x20,0x01, 0x23,0x01
    .byte 0x40,0x12, 0x43,0x00, 0x60,0xf4, 0x63,0xf4
    .byte 0x80,0x54, 0x83,0x54, 0xc0,0x00
    .byte 0xff,0xff
notes:                       /* C4 E4 G4 C5 G4 E4 C4 */
    .byte 0x59,0x31, 0xb3,0x31, 0x05,0x32, 0xb0,0x32
    .byte 0x05,0x32, 0xb3,0x31, 0x59,0x31
    .byte 0xff,0xff
