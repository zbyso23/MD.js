/* VGA13.COM — AT/286 VGA 320x200 demonstration: diagonal gradient and a
 * bright centered rectangle, drawn entirely by guest 16-bit x86 into A000h.
 * GPL-3.0-only; as --32 VGA13.s -o VGA13.o &&
 * ld -m elf_i386 -Ttext 0x100 --oformat binary -o VGA13.COM VGA13.o
 */
.code16
.intel_syntax noprefix
.section .text
.global _start
_start:
    mov ax,0x0013
    int 0x10
    mov ax,0xa000
    mov es,ax
    xor di,di
    xor bx,bx          /* y */
row:
    xor si,si          /* x */
    mov cx,320
pixel:
    mov ax,si
    shr ax,2
    add al,bl          /* smooth two-dimensional gradient */
    cmp si,80
    jb plot
    cmp si,240
    jae plot
    cmp bx,50
    jb plot
    cmp bx,150
    jae plot
    mov al,0xe0        /* contrasting central rectangle */
plot:
    stosb
    inc si
    loop pixel
    inc bx
    cmp bx,200
    jb row
    xor ax,ax
    int 0x16
    mov ax,3
    int 0x10
    mov ax,0x4c00
    int 0x21
