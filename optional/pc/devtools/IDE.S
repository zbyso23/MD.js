/* MD.js Ultra Phase 4N fullscreen 8086 DOS text editor.
 * Copyright 2026 MD.js Ultra contributors. GPL-3.0-only.
 * Native 16-bit DOS .COM; BIOS keyboard + CGA/HGC text VRAM; no 186+ opcodes.
 * 16 KiB ASCII file limit. No syntax-highlighting or Unicode claims.
 * F1 help, F3/Ctrl-S save, Esc/F10 exit, arrows/Home/End/PgUp/PgDn,
 * Backspace/Del/Enter/printable characters. Read-only B: requires RW work-copy.
 */
.intel_syntax noprefix
.code16
.global start
.equ CAP,16380
.equ ROWS,20
start:
 push cs
 pop ds
 cld
 mov si,0x81
skipws:
 cmp byte ptr [si],' '
 je L_short_1
 jmp copyname
L_short_1:
 inc si
 jmp skipws
copyname:
 lea di,[filename]
 mov cx,61
name_loop:
 lodsb
 cmp al,13
 jne L_short_2
 jmp name_done
L_short_2:
 cmp al,' '
 jne L_short_3
 jmp name_done
L_short_3:
 cmp al,9
 jne L_short_4
 jmp name_done
L_short_4:
 stosb
 loop name_loop
name_done:
 mov byte ptr [di],0
 cmp byte ptr [filename],0
 je L_short_5
 jmp gotname
L_short_5:
 mov si,offset defaultname
 mov di,offset filename
next_default:
 lodsb
 stosb
 or al,al
 jz L_short_6
 jmp next_default
L_short_6:
gotname:
 mov ax,0x3d00
 mov dx,offset filename
 int 0x21
 jnc L_short_7
 jmp selectvideo
L_short_7:
 mov bx,ax
 mov ah,0x3f
 mov cx,CAP
 mov dx,offset document
 int 0x21
 jnc L_short_8
 jmp close_initial
L_short_8:
 mov word ptr [used],ax
close_initial:
 mov ah,0x3e
 int 0x21
selectvideo:
 int 0x11
 and ax,0x30
 cmp ax,0x30
 je L_short_9
 jmp cga_video
L_short_9:
 mov word ptr [vidseg],0xb000
 mov al,7
 jmp video_mode
cga_video:
 mov word ptr [vidseg],0xb800
 mov al,3
video_mode:
 mov byte ptr [mode],al
 xor ah,ah
 int 0x10
editor_loop:
 call redraw
 xor ah,ah
 int 0x16
 cmp al,19
 jne L_short_10
 jmp editor_save
L_short_10:
 cmp ah,0x3d
 jne L_short_11
 jmp editor_save
L_short_11:
 cmp al,27
 jne L_short_12
 jmp editor_exit
L_short_12:
 cmp ah,0x44
 jne L_short_13
 jmp editor_exit
L_short_13:
 cmp ah,0x3b
 jne L_short_14
 jmp editor_help
L_short_14:
 cmp ah,0x4b
 jne L_short_15
 jmp arrow_left
L_short_15:
 cmp ah,0x4d
 jne L_short_16
 jmp arrow_right
L_short_16:
 cmp ah,0x48
 jne L_short_17
 jmp arrow_up
L_short_17:
 cmp ah,0x50
 jne L_short_18
 jmp arrow_down
L_short_18:
 cmp ah,0x47
 jne L_short_19
 jmp line_home
L_short_19:
 cmp ah,0x4f
 jne L_short_20
 jmp line_end
L_short_20:
 cmp ah,0x49
 jne L_short_21
 jmp page_up
L_short_21:
 cmp ah,0x51
 jne L_short_22
 jmp page_down
L_short_22:
 cmp ah,0x53
 jne L_short_23
 jmp forward_delete
L_short_23:
 cmp al,8
 jne L_short_24
 jmp backward_delete
L_short_24:
 cmp al,13
 jne L_short_25
 jmp add_newline
L_short_25:
 cmp al,9
 jne L_short_26
 jmp add_tab
L_short_26:
 cmp al,32
 jae L_short_27
 jmp editor_loop
L_short_27:
 cmp al,126
 jbe L_short_28
 jmp editor_loop
L_short_28:
 call insert_char
 jmp editor_loop
editor_help:
 mov word ptr [notice_ptr],offset helpmsg
 call redraw
 xor ah,ah
 int 0x16
 mov word ptr [notice_ptr],offset normalmsg
 jmp editor_loop
editor_save:
 mov ax,0x3c00
 xor cx,cx
 mov dx,offset filename
 int 0x21
 jnc L_short_29
 jmp failed_save
L_short_29:
 mov bx,ax
 mov ah,0x40
 mov cx,word ptr [used]
 mov dx,offset document
 int 0x21
 jnc L_short_30
 jmp write_fail
L_short_30:
 cmp ax,word ptr [used]
 je L_short_31
 jmp write_fail
L_short_31:
 mov word ptr [dirty],0
 mov word ptr [confirm_exit],0
 mov word ptr [notice_ptr],offset savedmsg
 jmp save_close
write_fail:
 mov word ptr [notice_ptr],offset failmsg
save_close:
 mov ah,0x3e
 int 0x21
 jmp editor_loop
failed_save:
 mov word ptr [notice_ptr],offset failmsg
 jmp editor_loop
editor_exit:
 cmp word ptr [dirty],0
 jne L_dirty_first
 jmp exit_editor_now
L_dirty_first:
 cmp word ptr [confirm_exit],1
 jne L_confirm_first
 jmp exit_editor_now
L_confirm_first:
 mov word ptr [confirm_exit],1
 mov word ptr [notice_ptr],offset discardmsg
 jmp editor_loop
exit_editor_now:
 mov al,byte ptr [mode]
 xor ah,ah
 int 0x10
 mov ax,0x4c00
 int 0x21
arrow_left:
 cmp word ptr [caret],0
 jne L_short_32
 jmp editor_loop
L_short_32:
 dec word ptr [caret]
 mov bx,word ptr [caret]
 cmp byte ptr [document+bx],10
 je L_short_33
 jmp editor_loop
L_short_33:
 cmp bx,0
 jne L_short_34
 jmp editor_loop
L_short_34:
 dec word ptr [caret]
 jmp editor_loop
arrow_right:
 mov bx,word ptr [caret]
 cmp bx,word ptr [used]
 jb L_short_35
 jmp editor_loop
L_short_35:
 cmp byte ptr [document+bx],13
 je L_short_36
 jmp right_once
L_short_36:
 cmp byte ptr [document+bx+1],10
 je L_short_37
 jmp right_once
L_short_37:
 inc word ptr [caret]
right_once:
 inc word ptr [caret]
 jmp editor_loop
line_home:
 call find_start
 mov word ptr [caret],bx
 jmp editor_loop
line_end:
 call find_end
 mov word ptr [caret],bx
 jmp editor_loop
arrow_up:
 call find_start
 cmp bx,0
 jne L_short_38
 jmp editor_loop
L_short_38:
 dec bx
 call previous_start
 call advance_col
 mov word ptr [caret],bx
 jmp editor_loop
arrow_down:
 call find_end
 cmp bx,word ptr [used]
 jb L_short_39
 jmp editor_loop
L_short_39:
 cmp byte ptr [document+bx],13
 je L_short_40
 jmp skip_newline
L_short_40:
 inc bx
skip_newline:
 inc bx
 call advance_col
 mov word ptr [caret],bx
 jmp editor_loop
page_up:
 mov cx,ROWS
up_repeat:
 push cx
 call find_start
 or bx,bx
 jnz L_short_41
 jmp up_done
L_short_41:
 dec bx
 call previous_start
 call advance_col
 mov word ptr [caret],bx
up_done:
 pop cx
 loop up_repeat
 jmp editor_loop
page_down:
 mov cx,ROWS
down_repeat:
 push cx
 call find_end
 cmp bx,word ptr [used]
 jb L_short_42
 jmp down_done
L_short_42:
 cmp byte ptr [document+bx],13
 je L_short_43
 jmp skip_pgcr
L_short_43:
 inc bx
skip_pgcr:
 inc bx
 call advance_col
 mov word ptr [caret],bx
down_done:
 pop cx
 loop down_repeat
 jmp editor_loop
/* BX = beginning of line holding caret. */
find_start:
 mov bx,word ptr [caret]
start_loop:
 or bx,bx
 jnz L_short_44
 jmp start_done
L_short_44:
 cmp byte ptr [document+bx-1],10
 jne L_short_45
 jmp start_done
L_short_45:
 dec bx
 jmp start_loop
start_done:
 ret
/* BX = end-of-line position (CR/LF or used). */
find_end:
 mov bx,word ptr [caret]
end_loop:
 cmp bx,word ptr [used]
 jb L_short_46
 jmp end_done
L_short_46:
 cmp byte ptr [document+bx],13
 jne L_short_47
 jmp end_done
L_short_47:
 cmp byte ptr [document+bx],10
 jne L_short_48
 jmp end_done
L_short_48:
 inc bx
 jmp end_loop
end_done:
 ret
previous_start:
 or bx,bx
 jnz L_short_49
 jmp previous_done
L_short_49:
 cmp byte ptr [document+bx-1],10
 jne L_short_50
 jmp previous_done
L_short_50:
 dec bx
 jmp previous_start
previous_done:
 ret
/* BX at target line beginning; advance to wanted column. */
advance_col:
 mov cx,word ptr [wanted_col]
advance_loop:
 jcxz advance_done
 cmp bx,word ptr [used]
 jb L_short_51
 jmp advance_done
L_short_51:
 cmp byte ptr [document+bx],13
 jne L_short_52
 jmp advance_done
L_short_52:
 cmp byte ptr [document+bx],10
 jne L_short_53
 jmp advance_done
L_short_53:
 inc bx
 dec cx
 jmp advance_loop
advance_done:
 ret
backward_delete:
 cmp word ptr [caret],0
 jne L_short_54
 jmp editor_loop
L_short_54:
 dec word ptr [caret]
 mov bx,word ptr [caret]
 cmp byte ptr [document+bx],10
 je L_short_55
 jmp backward_single
L_short_55:
 cmp bx,0
 jne L_short_56
 jmp backward_single
L_short_56:
 cmp byte ptr [document+bx-1],13
 je L_short_57
 jmp backward_single
L_short_57:
 dec word ptr [caret]
 call remove_at
backward_single:
 call remove_at
 jmp editor_loop
forward_delete:
 mov bx,word ptr [caret]
 cmp bx,word ptr [used]
 jb L_short_58
 jmp editor_loop
L_short_58:
 cmp byte ptr [document+bx],13
 je L_short_59
 jmp delete_one
L_short_59:
 call remove_at
 delete_one:
 call remove_at
 jmp editor_loop
/* Removes byte at caret, moves rest left */
remove_at:
 mov bx,word ptr [caret]
 mov cx,word ptr [used]
 cmp bx,cx
 jb L_short_60
 jmp remove_done
L_short_60:
 dec cx
remove_loop:
 cmp bx,cx
 jb L_short_61
 jmp removed
L_short_61:
 mov al,byte ptr [document+bx+1]
 mov byte ptr [document+bx],al
 inc bx
 jmp remove_loop
removed:
 dec word ptr [used]
 mov word ptr [dirty],1
remove_done:
 ret
add_tab:
 mov al,9
 call insert_char
 jmp editor_loop
add_newline:
 mov al,13
 call insert_char
 mov al,10
 call insert_char
 jmp editor_loop
/* Inserts AL at caret with 16KiB overflow guard; ES remains VRAM. */
insert_char:
 mov dx,word ptr [used]
 cmp dx,CAP
 jb L_short_62
 jmp insert_done
L_short_62:
 mov bl,al
 xor bh,bh
 mov si,dx
insert_shift:
 cmp si,word ptr [caret]
 ja L_short_63
 jmp insert_here
L_short_63:
 mov dl,byte ptr [document+si-1]
 mov byte ptr [document+si],dl
 dec si
 jmp insert_shift
insert_here:
 mov byte ptr [document+si],bl
 inc word ptr [caret]
 inc word ptr [used]
 mov word ptr [dirty],1
 mov word ptr [notice_ptr],offset normalmsg
insert_done:
 ret
/* Compute caret logical line/col, adjust viewport; then redraw display. */
redraw:
 xor bx,bx
 xor dx,dx
 xor si,si
cursor_scan:
 cmp si,word ptr [caret]
 jb L_short_64
 jmp cursor_scanned
L_short_64:
 mov al,byte ptr [document+si]
 cmp al,10
 je L_short_65
 jmp scan_nonlf
L_short_65:
 inc bx
 xor dx,dx
 jmp scan_next
scan_nonlf:
 cmp al,13
 jne L_short_66
 jmp scan_next
L_short_66:
 inc dx
scan_next:
 inc si
 jmp cursor_scan
cursor_scanned:
 mov word ptr [wanted_col],dx
 mov ax,word ptr [top_line]
 cmp bx,ax
 jb L_short_67
 jmp top_check_bottom
L_short_67:
 mov word ptr [top_line],bx
 jmp check_horizontal
top_check_bottom:
 add ax,ROWS
 cmp bx,ax
 jae L_short_68
 jmp check_horizontal
L_short_68:
 mov ax,bx
 sub ax,ROWS-1
 mov word ptr [top_line],ax
check_horizontal:
 mov ax,word ptr [left_col]
 cmp dx,ax
 jb L_short_69
 jmp hcheck_right
L_short_69:
 mov word ptr [left_col],dx
 jmp draw_start
hcheck_right:
 add ax,79
 cmp dx,ax
 ja L_short_70
 jmp draw_start
L_short_70:
 mov ax,dx
 sub ax,79
 mov word ptr [left_col],ax
draw_start:
 mov ax,word ptr [vidseg]
 mov es,ax
 xor di,di
 mov ax,0x0720
 mov cx,2000
 rep stosw
 mov di,0
 mov ax,0x1f20
 mov cx,80
 rep stosw
 mov di,0
 mov si,offset titlemsg
 mov ah,0x1f
 call draw_string
 mov di,160
 mov si,offset filename
 mov ah,0x0f
 call draw_string
 cmp word ptr [dirty],0
 je L_notdirty
 mov di,160+158
 mov ax,0x0e2a
 mov word ptr es:[di],ax
L_notdirty:
 mov di,22*160
 mov si,offset sepmsg
 mov ah,0x1f
 call draw_string
 mov di,23*160
 mov si,word ptr [notice_ptr]
 mov ah,0x0e
 call draw_string
 mov di,24*160
 mov si,offset footmsg
 mov ah,0x70
 call draw_string
 mov si,0
 xor bx,bx
search_top:
 cmp bx,word ptr [top_line]
 jb L_short_71
 jmp at_top
L_short_71:
 cmp si,word ptr [used]
 jb L_short_72
 jmp at_top
L_short_72:
 mov al,byte ptr [document+si]
 inc si
 cmp al,10
 je L_short_73
 jmp search_top
L_short_73:
 inc bx
 jmp search_top
at_top:
 mov bx,2
 xor dx,dx
render_loop:
 cmp bx,22
 jb L_short_74
 jmp draw_caret
L_short_74:
 cmp si,word ptr [used]
 jb L_short_75
 jmp draw_caret
L_short_75:
 mov al,byte ptr [document+si]
 inc si
 cmp al,10
 jne L_short_76
 jmp next_row
L_short_76:
 cmp al,13
 jne L_short_77
 jmp render_loop
L_short_77:
 cmp al,9
 je L_short_78
 jmp char_normal
L_short_78:
 mov al,32
char_normal:
 cmp al,32
 jb L_short_79
 jmp char_ok
L_short_79:
 mov al,'.'
char_ok:
 cmp dx,word ptr [left_col]
 jae L_short_80
 jmp increment_col
L_short_80:
 mov cx,dx
 sub cx,word ptr [left_col]
 cmp cx,80
 jb L_short_81
 jmp increment_col
L_short_81:
 push ax
 push dx
 mov ax,bx
 mov di,160
 mul di
 mov di,ax
 pop dx
 mov cx,dx
 sub cx,word ptr [left_col]
 shl cx,1
 add di,cx
 pop ax
 mov ah,0x07
 mov word ptr es:[di],ax
increment_col:
 inc dx
 jmp render_loop
next_row:
 inc bx
 xor dx,dx
 jmp render_loop
draw_caret:
 /* compute cursorLine/col again, BIOS cursor x/y */
 xor bx,bx
 xor dx,dx
 xor si,si
final_cursor_scan:
 cmp si,word ptr [caret]
 jb L_short_82
 jmp final_cursor_done
L_short_82:
 mov al,byte ptr [document+si]
 cmp al,10
 je L_short_83
 jmp final_nonlf
L_short_83:
 inc bx
 xor dx,dx
 jmp final_scan_next
final_nonlf:
 cmp al,13
 jne L_short_84
 jmp final_scan_next
L_short_84:
 inc dx
final_scan_next:
 inc si
 jmp final_cursor_scan
final_cursor_done:
 sub bx,word ptr [top_line]
 add bx,2
 sub dx,word ptr [left_col]
 cmp dx,79
 ja L_short_85
 jmp cursor_col_ok
L_short_85:
 mov dx,79
cursor_col_ok:
 mov dh,bl
 mov bh,0
 mov ah,2
 int 0x10
 ret
/* AX= character+attr, SI -> zero-terminated; DI=video destination, AH attr */
draw_string:
 lodsb
 or al,al
 jnz L_short_86
 jmp string_done
L_short_86:
 mov word ptr es:[di],ax
 add di,2
 jmp draw_string
string_done:
 ret
mode: .byte 3
vidseg: .word 0xb800
used: .word 0
caret: .word 0
top_line: .word 0
left_col: .word 0
wanted_col: .word 0
dirty: .word 0
confirm_exit: .word 0
notice_ptr: .word normalmsg
filename: .space 64
defaultname: .asciz "UNTITLED.C"
titlemsg: .asciz " MD.js ULTRA  /  XT + AT/286  /  DOS SOURCE EDITOR "
sepmsg: .asciz " -------------------------------------------------------------------------------"
normalmsg: .asciz " Editing in 16 KiB buffer. Save requires a writable B: work copy."
savedmsg: .asciz " Saved to disk. Export your work IMG to keep changes."
failmsg: .asciz " WRITE FAILED! Use Workbench -> Pracovni kopie B: (RW)."
discardmsg: .asciz " UNSAVED CHANGES! F3 saves, press Esc/F10 again to discard. "
helpmsg: .asciz " Arrows/Home/End/PgUp/PgDn, Enter, Del, Backspace; any key to return."
footmsg: .asciz " F1 Help      F3 / Ctrl-S Save      Esc / F10 Exit      F2 Handbook (phase 4O)"
document: .space CAP+2
