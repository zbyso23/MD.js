```c
#include <stdio.h>

// Basic ASM - bez operandů
void nop_function() {
    asm("nop");
}

// Extended ASM - s operandy
int main() {
    int a = 10, b = 20, sum;
    
    // Použití Extended ASM pro sečtení dvou proměnných
    // a = vstup, b = vstup
    // sum = výstup
    asm("addl %%ebx, %%eax"
        : "=a" (sum)
        : "a" (a), "b" (b)
    );
    
    printf("Soucet je: %d\n", sum);

    long long rdtsc_val;
    
    // Čtení x86-64 časovače (rdtsc)
    asm volatile("rdtsc"
        : "=A" (rdtsc_val)
    );

    printf("RDTSC hodnota: %llu\n", rdtsc_val);
    
    return 0;
}
```