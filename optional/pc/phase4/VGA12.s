/* VGA12.COM — AT/286 VGA 640x480x16: real planar VRAM mosaic.
 * Four passes write each plane using Sequencer map mask (3C4h/3C5h).
 * Color index = (x_byte/8 XOR y/32) AND 15, creating coarse color tiles.
 * GPL-3.0-only; as --32 VGA12.s -o VGA12.o &&
 * ld -m elf_i386 -Ttext 0x100 --oformat binary -o VGA12.COM VGA12.o
 */
.code16
.intel_syntax noprefix
.section .text
.global _start
_start:
    mov ax,0x0012
    int 0x10
    mov ax,0xa000
    mov es,ax
    mov bp,1           /* plane map mask */
plane:
    mov dx,0x3c4
    mov al,2
    out dx,al
    inc dx
    mov ax,bp
    out dx,al
    xor di,di
    xor bx,bx          /* row 0..479 */
row:
    xor si,si          /* 80 bytes = 640 pixels */
    mov cx,80
byte_pixel:
    mov ax,si
    shr ax,3
    mov dx,bx
    shr dx,5
    xor ax,dx
    test ax,bp
    jz dark
    mov al,0xff
    jmp write_byte
dark:
    xor al,al
write_byte:
    stosb
    inc si
    loop byte_pixel
    inc bx
    cmp bx,480
    jb row
    shl bp,1
    cmp bp,16
    jb plane
    mov dx,0x3c4       /* restore map mask */
    mov al,2
    out dx,al
    inc dx
    mov al,15
    out dx,al
    xor ax,ax
    int 0x16
    mov ax,3
    int 0x10
    mov ax,0x4c00
    int 0x21
