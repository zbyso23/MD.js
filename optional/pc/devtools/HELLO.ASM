; MD.js Ultra: 16-bit DOS / 8086, NASM-compatible example
cpu 8086
bits 16
org 0x100
start:
    mov ah, 9
    mov dx, message
    int 0x21
    mov ax, 0x4c00
    int 0x21
message: db 'HELLO FROM XT/286!', 13, 10, '$'
