#include <cstdint>
#include <cstdlib>
using byte = unsigned char;
#define A0 14
#define A1 15
inline int digitalRead(int){return 0;}
inline int analogRead(int){return 512;}
inline void analogWrite(int,int){}
inline long map(long x,long a,long b,long c,long d){return (x-a)*(d-c)/(b-a)+c;}
#define LED_BUILTIN 13
#define OUTPUT 1
#define INPUT 0
#define INPUT_PULLUP 2
#define HIGH 1
#define LOW 0
inline void pinMode(int,int) {}
inline void digitalWrite(int,int) {}
inline void delay(int) {}
struct {void begin(int) {} void println(const char*) {} } Serial;
