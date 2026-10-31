; NASM 16-bit illustrative subroutine: SB DSP 8-bit DMA playback
; preconditions: DS points to this segment, sample_buffer below 1 MiB,
; physical address % 65536 + sample length <= 65536.
; DSP reset and 0xAA ready acknowledgement must be performed first.
; This is a register-programming example, NOT a complete player.
program_dma_ch1:
    cli
    mov dx,000Ah         ; DMA single-channel mask
    mov al,05h           ; mask channel 1
    out dx,al
    mov dx,000Ch         ; reset 8237 byte flip-flop
    xor al,al
    out dx,al
    mov ax,ds
    mov cl,4
    shl ax,cl
    add ax,sample_buffer ; low physical bits (simplified!)
    mov dx,0002h         ; channel 1 address
    out dx,al
    mov al,ah
    out dx,al
    ; physical page address is NOT calculated above. Set port 83h
    ; from verified physical 20-bit address, not from DS directly.
    mov dx,0003h         ; channel 1 count
    mov ax,sample_end-sample_buffer-1
    out dx,al
    mov al,ah
    out dx,al
    mov dx,000Bh
    mov al,049h          ; single transfer, read from memory, ch1
    out dx,al
    mov dx,000Ah
    mov al,01h           ; unmask channel 1
    out dx,al
    sti
    ; DSP command 14h + low/high (count-1) to port BASE+0Ch,
    ; after polling write-ready status at BASE+0Ch (bit 7 clear).
    ret
sample_buffer: times 256 db 128
sample_end:
