/* CGA Mini Mandelbrot, 8086/8088 instruction set only; no FPU.
 * Fixed point Q6. 80x50 cells, 4 scanlines/cell, max 12 iterations.
 * GPL-3.0-only. GNU as .code16 / .COM, no 386 instructions. */
.intel_syntax noprefix
.code16
.section .text
.global _start
_start:
    push cs
    pop ds
    mov ax, 4
    int 0x10
    mov ax, 47104
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
    mov ah,al
    shl ah,1
    shl ah,1
    or al,ah
    mov ah,al
    mov cl,4
    shl al,cl
    or al,ah
    mov [pixel],al
    mov ax,[row]
    mov bx,4
    mul bx
    mov si,ax
    mov cx,4
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
    cmp word ptr [col],80
    jae col_done
    jmp col_loop
col_done:
    inc word ptr [row]
    add word ptr [cim],3
    cmp word ptr [row],50
    jae row_done
    jmp row_loop
row_done:
    xor ax,ax
    int 0x16
    mov ax,3
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
    .word 0
    .word 8192
    .word 80
    .word 8272
    .word 160
    .word 8352
    .word 240
    .word 8432
    .word 320
    .word 8512
    .word 400
    .word 8592
    .word 480
    .word 8672
    .word 560
    .word 8752
    .word 640
    .word 8832
    .word 720
    .word 8912
    .word 800
    .word 8992
    .word 880
    .word 9072
    .word 960
    .word 9152
    .word 1040
    .word 9232
    .word 1120
    .word 9312
    .word 1200
    .word 9392
    .word 1280
    .word 9472
    .word 1360
    .word 9552
    .word 1440
    .word 9632
    .word 1520
    .word 9712
    .word 1600
    .word 9792
    .word 1680
    .word 9872
    .word 1760
    .word 9952
    .word 1840
    .word 10032
    .word 1920
    .word 10112
    .word 2000
    .word 10192
    .word 2080
    .word 10272
    .word 2160
    .word 10352
    .word 2240
    .word 10432
    .word 2320
    .word 10512
    .word 2400
    .word 10592
    .word 2480
    .word 10672
    .word 2560
    .word 10752
    .word 2640
    .word 10832
    .word 2720
    .word 10912
    .word 2800
    .word 10992
    .word 2880
    .word 11072
    .word 2960
    .word 11152
    .word 3040
    .word 11232
    .word 3120
    .word 11312
    .word 3200
    .word 11392
    .word 3280
    .word 11472
    .word 3360
    .word 11552
    .word 3440
    .word 11632
    .word 3520
    .word 11712
    .word 3600
    .word 11792
    .word 3680
    .word 11872
    .word 3760
    .word 11952
    .word 3840
    .word 12032
    .word 3920
    .word 12112
    .word 4000
    .word 12192
    .word 4080
    .word 12272
    .word 4160
    .word 12352
    .word 4240
    .word 12432
    .word 4320
    .word 12512
    .word 4400
    .word 12592
    .word 4480
    .word 12672
    .word 4560
    .word 12752
    .word 4640
    .word 12832
    .word 4720
    .word 12912
    .word 4800
    .word 12992
    .word 4880
    .word 13072
    .word 4960
    .word 13152
    .word 5040
    .word 13232
    .word 5120
    .word 13312
    .word 5200
    .word 13392
    .word 5280
    .word 13472
    .word 5360
    .word 13552
    .word 5440
    .word 13632
    .word 5520
    .word 13712
    .word 5600
    .word 13792
    .word 5680
    .word 13872
    .word 5760
    .word 13952
    .word 5840
    .word 14032
    .word 5920
    .word 14112
    .word 6000
    .word 14192
    .word 6080
    .word 14272
    .word 6160
    .word 14352
    .word 6240
    .word 14432
    .word 6320
    .word 14512
    .word 6400
    .word 14592
    .word 6480
    .word 14672
    .word 6560
    .word 14752
    .word 6640
    .word 14832
    .word 6720
    .word 14912
    .word 6800
    .word 14992
    .word 6880
    .word 15072
    .word 6960
    .word 15152
    .word 7040
    .word 15232
    .word 7120
    .word 15312
    .word 7200
    .word 15392
    .word 7280
    .word 15472
    .word 7360
    .word 15552
    .word 7440
    .word 15632
    .word 7520
    .word 15712
    .word 7600
    .word 15792
    .word 7680
    .word 15872
    .word 7760
    .word 15952
    .word 7840
    .word 16032
    .word 7920
    .word 16112
