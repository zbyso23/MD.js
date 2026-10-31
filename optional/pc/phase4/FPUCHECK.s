/* Minimal 80287XL self-test for AT/286, ~80 bytes. GPL-3.0-only.
 * FNINIT; FLD1; FADD ST0,ST0; FISTP word -> checks 2 and reports via DOS.
 * 16-bit instruction encoding only; no FPU on XT. */
.intel_syntax noprefix
.code16
.section .text
.global _start
_start:
 push cs
 pop ds
 mov word ptr [value], 0
 fninit
 fld1
 fadd st(0),st(0)
 fistp word ptr [value]
 cmp word ptr [value],2
 je success
 mov dx,OFFSET bad
 jmp output
success:
 mov dx,OFFSET good
output:
 mov ah,9
 int 0x21
 mov ax,0x4c00
 int 0x21
value: .word 0
good: .asciz "80287XL FPU OK$"
bad: .asciz "80287XL FPU NOT ENABLED$"
