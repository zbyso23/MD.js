/* Sample ANSI C (requires separately obtained DOS C toolchain).
 * Unlike DOS ASM, C startup/library linkage is compiler-specific. */
#include <stdio.h>
int main(void) {
    puts("Hello from 16-bit DOS C!");
    return 0;
}
