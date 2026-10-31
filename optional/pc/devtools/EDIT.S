/* MD.js Ultra DOS Tiny Line Editor, 8086 compatible. GPL-3.0-only.
 * EXAMPLE: EDIT HELLO.ASM ; :L list ; :D delete last line ; :W save ; :Q quit
 * File is limited to 8192 bytes. DOS functions only. Works on 8086/286.
 * A/B development disks are write protected by default, so save on a writable
 * user-created work disk (or use the browser's host-side file import/export).
 */
.intel_syntax noprefix
.code16
.global start
start:
  push cs
  pop ds
  push cs
  pop es
  cld
  mov si, 0x81
skipspace:
  cmp byte ptr [si], ' '
  jne namecopybegin
  inc si
  jmp skipspace
namecopybegin:
  lea di, [filename]
  mov cx, 63
namecopy:
  lodsb
  cmp al, 13
  je namedone
  cmp al, ' '
  je namedone
  cmp al, 9
  je namedone
  stosb
  loop namecopy
namedone:
  mov byte ptr [di], 0
  cmp byte ptr [filename], 0
  jne openfile
  lea dx, [msgusage]
  call print
  jmp exit
openfile:
  mov ax, 0x3d00
  lea dx, [filename]
  int 0x21
  jc banner
  mov bx, ax
  mov ah, 0x3f
  mov cx, 8192
  lea dx, [filebuf]
  int 0x21
  jc closefile
  mov word ptr [used], ax
closefile:
  mov ah, 0x3e
  int 0x21
banner:
  lea dx, [msgwelcome]
  call print
mainloop:
  lea dx, [msgprompt]
  call print
  mov byte ptr [inputbuf+1], 0
  mov ah, 0x0a
  lea dx, [inputbuf]
  int 0x21
  lea dx, [crlf]
  call print
  mov al, byte ptr [inputbuf+1]
  cmp al, 2
  jb appendline
  cmp byte ptr [inputbuf+2], ':'
  jne appendline
  mov al, byte ptr [inputbuf+3]
  cmp al, 'q'
  jne notquit1
  jmp exit
notquit1:
  cmp al, 'Q'
  jne notquit2
  jmp exit
notquit2:
  cmp al, 'l'
  je listfile
  cmp al, 'L'
  je listfile
  cmp al, 'w'
  je savefile
  cmp al, 'W'
  je savefile
  cmp al, 'c'
  jne notclear1
  jmp clearfile
notclear1:
  cmp al, 'C'
  jne notclear2
  jmp clearfile
notclear2:
  cmp al, 'd'
  jne notdel1
  jmp deletelast
notdel1:
  cmp al, 'D'
  jne notdel2
  jmp deletelast
notdel2:
  lea dx, [msghelp]
  call print
  jmp mainloop
appendline:
  xor cx, cx
  mov cl, byte ptr [inputbuf+1]
  mov ax, word ptr [used]
  add ax, cx
  add ax, 2
  cmp ax, 8192
  jbe appendok
  jmp filefull
appendok:
  mov bx, word ptr [used]
  lea di, [filebuf+bx]
  lea si, [inputbuf+2]
  rep movsb
  mov ax, 0x0a0d
  stosw
  mov ax, di
  sub ax, offset filebuf
  mov word ptr [used], ax
  jmp mainloop
listfile:
  mov bx, 1
  mov cx, word ptr [used]
  jcxz listdone
  mov ah, 0x40
  lea dx, [filebuf]
  int 0x21
listdone:
  jmp mainloop
savefile:
  mov ah, 0x3c
  xor cx, cx
  lea dx, [filename]
  int 0x21
  jc saveerror
  mov bx, ax
  mov ah, 0x40
  mov cx, word ptr [used]
  lea dx, [filebuf]
  int 0x21
  jc writeerror
  cmp ax, word ptr [used]
  jne writeerror
  mov ah, 0x3e
  int 0x21
  lea dx, [msgsaved]
  call print
  jmp mainloop
writeerror:
  mov ah, 0x3e
  int 0x21
saveerror:
  lea dx, [msgro]
  call print
  jmp mainloop
clearfile:
  mov word ptr [used], 0
  lea dx, [msgcleared]
  call print
  jmp mainloop
deletelast:
  mov bx, word ptr [used]
  cmp bx, 2
  jae delhasline
  jmp mainloop
delhasline:
  sub bx, 2
findprev:
  or bx, bx
  jz deleteall
  cmp byte ptr [filebuf+bx-1], 0x0a
  je deldone
  dec bx
  jmp findprev
deleteall:
  xor bx, bx
deldone:
  mov word ptr [used], bx
  jmp mainloop
filefull:
  lea dx, [msgfull]
  call print
  jmp mainloop
print:
  mov ah, 9
  int 0x21
  ret
exit:
  mov ax, 0x4c00
  int 0x21
msgusage: .ascii "Usage: EDIT FILE.TXT\r\n$"
msgwelcome: .ascii "MD.js 8086 Line Editor - :L list :D delete :C clear :W save :Q quit\r\n$"
msgprompt: .ascii "edit> $"
msghelp: .ascii "Commands: :L :D :C :W :Q ; otherwise append a text line\r\n$"
msgsaved: .ascii "Saved.\r\n$"
msgro: .ascii "Write failed. Disk may be write protected.\r\n$"
msgcleared: .ascii "Buffer cleared.\r\n$"
msgfull: .ascii "Buffer limit 8192 bytes.\r\n$"
crlf: .ascii "\r\n$"
filename: .space 64
used: .word 0
inputbuf:
 .byte 78
 .byte 0
 .space 80
filebuf: .space 8192
