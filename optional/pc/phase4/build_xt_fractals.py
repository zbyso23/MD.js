from pathlib import Path
import subprocess
root=Path(__file__).resolve().parent
root.mkdir(parents=True,exist_ok=True)
for kind in ('CGA','HGC'):
    cga=kind=='CGA'; w=80 if cga else 90; h=50 if cga else 58; scale=4 if cga else 6
    code=f'''/* {kind} Mini Mandelbrot, 8086/8088 instruction set only; no FPU.
 * Fixed point Q6. {w}x{h} cells, {scale} scanlines/cell, max 12 iterations.
 * GPL-3.0-only. GNU as .code16 / .COM, no 386 instructions. */
.intel_syntax noprefix
.code16
.section .text
.global _start
_start:
    push cs
    pop ds
    mov ax, {4 if cga else 7}
    int 0x10
'''
    if not cga:
        code+='''    mov dx, 0x3bf
    mov al, 3
    out dx, al
    mov dx, 0x3b8
    mov al, 0x0a
    out dx, al
'''
    code+=f'''    mov ax, {0xb800 if cga else 0xb000}
    mov es, ax
    mov word ptr [row],0
    mov word ptr [cim],-75
row_loop:
    mov word ptr [col],0
    mov word ptr [cre],-128
col_loop:
    mov word ptr [zx],0
    mov word ptr [zy],0
    mov byte ptr [iter],12
iterate:
    mov ax,[zx]
    imul word ptr [zx]
    shr ax,1
    shr ax,1
    shr ax,1
    shr ax,1
    shr ax,1
    shr ax,1
    mov bx,dx
    mov cl,10
    shl bx,cl
    or ax,bx
    mov [xx],ax
    mov ax,[zy]
    imul word ptr [zy]
    mov cl,6
    shr ax,cl
    mov bx,dx
    mov cl,10
    shl bx,cl
    or ax,bx
    mov [yy],ax
    add ax,[xx]
    cmp ax,256
    ja escaped
    mov ax,[zx]
    imul word ptr [zy]
    mov cl,5
    shr ax,cl
    mov bx,dx
    mov cl,11
    shl bx,cl
    or ax,bx
    add ax,[cim]
    mov [ny],ax
    mov ax,[xx]
    sub ax,[yy]
    add ax,[cre]
    mov [zx],ax
    mov ax,[ny]
    mov [zy],ax
    dec byte ptr [iter]
    jne iterate
    xor al,al
    jmp draw
escaped:
    mov al,[iter]
    and al,3
    jnz draw
    mov al,3
draw:
'''
    if cga:
        code+='''    mov ah,al
    shl ah,1
    shl ah,1
    or al,ah
    mov ah,al
    mov cl,4
    shl al,cl
    or al,ah
'''
    else:
        code+='''    test al,al
    jz draw_zero
    mov al,255
draw_zero:
'''
    code+=f'''    mov [pixel],al
    mov ax,[row]
    mov bx,{scale}
    mul bx
    mov si,ax
    mov cx,{scale}
draw_lines:
    mov di,si
    shl di,1
    mov di,[row_offsets+di]
    add di,[col]
    mov al,[pixel]
    mov es:[di],al
    inc si
    loop draw_lines
    inc word ptr [col]
    add word ptr [cre],2
    cmp word ptr [col],{w}
    jae col_done
    jmp col_loop
col_done:
    inc word ptr [row]
    add word ptr [cim],3
    cmp word ptr [row],{h}
    jae row_done
    jmp row_loop
row_done:
    xor ax,ax
    int 0x16
'''
    if not cga:
        code+='''    mov dx,0x3b8
    mov al,8
    out dx,al
'''
    code+=f'''    mov ax,{3 if cga else 7}
    int 0x10
    mov ax,0x4c00
    int 0x21
row:    .word 0
col:    .word 0
cre:    .word 0
cim:    .word 0
zx:     .word 0
zy:     .word 0
xx:     .word 0
yy:     .word 0
ny:     .word 0
iter:   .byte 0
pixel:  .byte 0
row_offsets:
'''
    for y in range(h*scale):
        offset=(y&1)*8192+(y//2)*80 if cga else (y&3)*8192+(y//4)*90
        code+=f'    .word {offset}\n'
    source=root/f'{kind}FRAC.s'; source.write_text(code)
    obj=root/f'{kind}FRAC.o'; binary=root/f'{kind}FRAC.COM'
    subprocess.run(['as','--32',str(source),'-o',str(obj)],check=True)
    subprocess.run(['ld','-m','elf_i386','-Ttext','0x100','-N','--oformat','binary','-e','_start',str(obj),'-o',str(binary)],check=True)
    obj.unlink()
    print(kind,binary.stat().st_size, binary.read_bytes()[:16].hex())
