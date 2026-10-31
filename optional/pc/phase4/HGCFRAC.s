/* HGC Mini Mandelbrot, 8086/8088 instruction set only; no FPU.
 * Fixed point Q6. 90x58 cells, 6 scanlines/cell, max 12 iterations.
 * GPL-3.0-only. GNU as .code16 / .COM, no 386 instructions. */
.intel_syntax noprefix
.code16
.section .text
.global _start
_start:
    push cs
    pop ds
    mov ax, 7
    int 0x10
    mov dx, 0x3bf
    mov al, 3
    out dx, al
    mov dx, 0x3b8
    mov al, 0x0a
    out dx, al
    mov ax, 45056
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
    test al,al
    jz draw_zero
    mov al,255
draw_zero:
    mov [pixel],al
    mov ax,[row]
    mov bx,6
    mul bx
    mov si,ax
    mov cx,6
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
    cmp word ptr [col],90
    jae col_done
    jmp col_loop
col_done:
    inc word ptr [row]
    add word ptr [cim],3
    cmp word ptr [row],58
    jae row_done
    jmp row_loop
row_done:
    xor ax,ax
    int 0x16
    mov dx,0x3b8
    mov al,8
    out dx,al
    mov ax,7
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
    .word 16384
    .word 24576
    .word 90
    .word 8282
    .word 16474
    .word 24666
    .word 180
    .word 8372
    .word 16564
    .word 24756
    .word 270
    .word 8462
    .word 16654
    .word 24846
    .word 360
    .word 8552
    .word 16744
    .word 24936
    .word 450
    .word 8642
    .word 16834
    .word 25026
    .word 540
    .word 8732
    .word 16924
    .word 25116
    .word 630
    .word 8822
    .word 17014
    .word 25206
    .word 720
    .word 8912
    .word 17104
    .word 25296
    .word 810
    .word 9002
    .word 17194
    .word 25386
    .word 900
    .word 9092
    .word 17284
    .word 25476
    .word 990
    .word 9182
    .word 17374
    .word 25566
    .word 1080
    .word 9272
    .word 17464
    .word 25656
    .word 1170
    .word 9362
    .word 17554
    .word 25746
    .word 1260
    .word 9452
    .word 17644
    .word 25836
    .word 1350
    .word 9542
    .word 17734
    .word 25926
    .word 1440
    .word 9632
    .word 17824
    .word 26016
    .word 1530
    .word 9722
    .word 17914
    .word 26106
    .word 1620
    .word 9812
    .word 18004
    .word 26196
    .word 1710
    .word 9902
    .word 18094
    .word 26286
    .word 1800
    .word 9992
    .word 18184
    .word 26376
    .word 1890
    .word 10082
    .word 18274
    .word 26466
    .word 1980
    .word 10172
    .word 18364
    .word 26556
    .word 2070
    .word 10262
    .word 18454
    .word 26646
    .word 2160
    .word 10352
    .word 18544
    .word 26736
    .word 2250
    .word 10442
    .word 18634
    .word 26826
    .word 2340
    .word 10532
    .word 18724
    .word 26916
    .word 2430
    .word 10622
    .word 18814
    .word 27006
    .word 2520
    .word 10712
    .word 18904
    .word 27096
    .word 2610
    .word 10802
    .word 18994
    .word 27186
    .word 2700
    .word 10892
    .word 19084
    .word 27276
    .word 2790
    .word 10982
    .word 19174
    .word 27366
    .word 2880
    .word 11072
    .word 19264
    .word 27456
    .word 2970
    .word 11162
    .word 19354
    .word 27546
    .word 3060
    .word 11252
    .word 19444
    .word 27636
    .word 3150
    .word 11342
    .word 19534
    .word 27726
    .word 3240
    .word 11432
    .word 19624
    .word 27816
    .word 3330
    .word 11522
    .word 19714
    .word 27906
    .word 3420
    .word 11612
    .word 19804
    .word 27996
    .word 3510
    .word 11702
    .word 19894
    .word 28086
    .word 3600
    .word 11792
    .word 19984
    .word 28176
    .word 3690
    .word 11882
    .word 20074
    .word 28266
    .word 3780
    .word 11972
    .word 20164
    .word 28356
    .word 3870
    .word 12062
    .word 20254
    .word 28446
    .word 3960
    .word 12152
    .word 20344
    .word 28536
    .word 4050
    .word 12242
    .word 20434
    .word 28626
    .word 4140
    .word 12332
    .word 20524
    .word 28716
    .word 4230
    .word 12422
    .word 20614
    .word 28806
    .word 4320
    .word 12512
    .word 20704
    .word 28896
    .word 4410
    .word 12602
    .word 20794
    .word 28986
    .word 4500
    .word 12692
    .word 20884
    .word 29076
    .word 4590
    .word 12782
    .word 20974
    .word 29166
    .word 4680
    .word 12872
    .word 21064
    .word 29256
    .word 4770
    .word 12962
    .word 21154
    .word 29346
    .word 4860
    .word 13052
    .word 21244
    .word 29436
    .word 4950
    .word 13142
    .word 21334
    .word 29526
    .word 5040
    .word 13232
    .word 21424
    .word 29616
    .word 5130
    .word 13322
    .word 21514
    .word 29706
    .word 5220
    .word 13412
    .word 21604
    .word 29796
    .word 5310
    .word 13502
    .word 21694
    .word 29886
    .word 5400
    .word 13592
    .word 21784
    .word 29976
    .word 5490
    .word 13682
    .word 21874
    .word 30066
    .word 5580
    .word 13772
    .word 21964
    .word 30156
    .word 5670
    .word 13862
    .word 22054
    .word 30246
    .word 5760
    .word 13952
    .word 22144
    .word 30336
    .word 5850
    .word 14042
    .word 22234
    .word 30426
    .word 5940
    .word 14132
    .word 22324
    .word 30516
    .word 6030
    .word 14222
    .word 22414
    .word 30606
    .word 6120
    .word 14312
    .word 22504
    .word 30696
    .word 6210
    .word 14402
    .word 22594
    .word 30786
    .word 6300
    .word 14492
    .word 22684
    .word 30876
    .word 6390
    .word 14582
    .word 22774
    .word 30966
    .word 6480
    .word 14672
    .word 22864
    .word 31056
    .word 6570
    .word 14762
    .word 22954
    .word 31146
    .word 6660
    .word 14852
    .word 23044
    .word 31236
    .word 6750
    .word 14942
    .word 23134
    .word 31326
    .word 6840
    .word 15032
    .word 23224
    .word 31416
    .word 6930
    .word 15122
    .word 23314
    .word 31506
    .word 7020
    .word 15212
    .word 23404
    .word 31596
    .word 7110
    .word 15302
    .word 23494
    .word 31686
    .word 7200
    .word 15392
    .word 23584
    .word 31776
    .word 7290
    .word 15482
    .word 23674
    .word 31866
    .word 7380
    .word 15572
    .word 23764
    .word 31956
    .word 7470
    .word 15662
    .word 23854
    .word 32046
    .word 7560
    .word 15752
    .word 23944
    .word 32136
    .word 7650
    .word 15842
    .word 24034
    .word 32226
    .word 7740
    .word 15932
    .word 24124
    .word 32316
