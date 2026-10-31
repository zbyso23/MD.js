/* MD.js Ultra / 80287XL: tiny, genuine x87 Mandelbrot renderer for VGA 13h.
 * GPL-3.0-only, copyright 2026 MD.js Ultra contributors.
 * GNU as --32 (.code16) -> ld -m elf_i386 -Ttext 0x100 --oformat binary.
 * Guest algorithm: 80x50 samples (4x4 VGA pixels), max 18 iterations.
 * Not a pre-rendered asset. Requires AT/286 + 80287XL (x87 ESC D8-DF).
 */
.intel_syntax noprefix
.code16
.global _start
.text
_start:
    push cs
    pop ds
    /* Without the optional FPU, the emulator historically skips x87 ESC.
       Probe FNSTSW before video mode so a missing 287XL cannot draw one color. */
    mov ax,0x1234
    fninit
    fnstsw ax
    test ax,ax
    jz fpu_found
    mov dx,offset flat:nofpu_message
    mov ah,9
    int 0x21
    mov ax,0x4c01
    int 0x21
fpu_found:
    mov ax,0x0013
    int 0x10
    mov ax,0xa000
    mov es,ax
    /* Install our own 19-entry VGA DAC gradient, independent of default palette. */
    mov dx,0x3c8
    mov al,16
    out dx,al
    inc dx
    xor bx,bx
    mov cx,19
palette_loop:
    mov al,bl
    shl al,1
    add al,bl
    out dx,al             /* red = 3*i */
    mov al,bl
    shl al,1
    out dx,al             /* green = 2*i */
    mov al,63
    sub al,bl
    sub al,bl
    out dx,al             /* blue = 63-2*i */
    inc bx
    loop palette_loop
    mov di,0
    mov bp,50
row:
    fld dword ptr [xmin]
    fstp dword ptr [real]
    mov bx,80
column:
    fldz
    fstp dword ptr [zx]
    fldz
    fstp dword ptr [zy]
    mov cx,18
iterate:
    fld dword ptr [zx]
    fmul st(0),st(0)
    fld dword ptr [zy]
    fmul st(0),st(0)
    faddp st(1),st(0)
    fcomp dword ptr [bound]
    fnstsw ax
    sahf
    ja draw
    fld dword ptr [zx]
    fmul dword ptr [zy]
    fadd st(0),st(0)
    fadd dword ptr [imag]
    fstp dword ptr [nexty]
    fld dword ptr [zx]
    fmul st(0),st(0)
    fld dword ptr [zy]
    fmul st(0),st(0)
    fsubp st(1),st(0)
    fadd dword ptr [real]
    fstp dword ptr [zx]
    fld dword ptr [nexty]
    fstp dword ptr [zy]
    loop iterate
draw:
    mov al,cl
    test al,al
    jz inside
    add al,16
inside:
    mov ah,al
    mov dx,4
pixelrow:
    mov word ptr es:[di],ax
    mov word ptr es:[di+2],ax
    add di,320
    dec dx
    jnz pixelrow
    sub di,1276
    fld dword ptr [real]
    fadd dword ptr [xstep]
    fstp dword ptr [real]
    dec bx
    jz rowend
    jmp column
rowend:
    add di,960
    fld dword ptr [imag]
    fadd dword ptr [ystep]
    fstp dword ptr [imag]
    dec bp
    jz finished
    jmp row
finished:
    xor ah,ah
    int 0x16
    mov ax,3
    int 0x10
    mov ax,0x4c00
    int 0x21
xmin:  .float -2.0
xstep: .float 0.0375
ystep: .float 0.048
bound: .float 4.0
real:  .float 0.0
imag:  .float -1.2
zx:    .float 0.0
zy:    .float 0.0
nexty: .float 0.0

nofpu_message: .ascii "\r\nMANDEL: enable 80287XL in AT/286 first.\r\n$"
