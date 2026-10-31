# From 8086 to Micro R — worked document

This document combines Mermaid, a table, ASM, Arduino, mathematical expressions and statistics.

## Diagram

```mermaid
flowchart LR
  A[8086 CPU] --> B[BIOS / DOS]
  B --> C[Arduino Graph]
  C --> D[Micro R]
```

## CPU instructions

| Instruction | Purpose |
|---|---|
| `PUSH AX` | Save AX on the stack |
| `POP AX` | Restore AX |
| `LOOP label` | Decrease CX and repeat |
| `INT 10h` | BIOS video services |

```asm
bits 16
org 100h
mov cx,5
again:
  nop
  loop again
mov ax,4c00h
int 21h
```

## Arduino

```cpp
void setup(){ pinMode(13,OUTPUT); }
void loop(){ digitalWrite(13,HIGH); delay(300); digitalWrite(13,LOW); delay(300); }
```

## Statistics

Sample mean: $\bar x = \frac{1}{n} \sum_{i=1}^{n}x_i$

```r
x <- c(3,5,8,13,21)
mean(x)
sd(x)
hist(x)
```
