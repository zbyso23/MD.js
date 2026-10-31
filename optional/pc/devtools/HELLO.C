/* Sample ANSI C (the Small-C compiler, ASM, YLINK and CLIB are on B:).
 * Unlike DOS ASM, C startup/library linkage is compiler-specific. */
#include <stdio.h>
int main(void) {
    puts("Hello from 16-bit DOS C!");
    return 0;
}
