```makefile
# Makefile pro kompilaci projektu
CC = gcc
CFLAGS = -Wall -g
SOURCES = main.c utils.c
OBJECTS = $(SOURCES:.c=.o)
EXECUTABLE = my_app

.PHONY: all clean

all: $(EXECUTABLE)

$(EXECUTABLE): $(OBJECTS)
	$(CC) $(CFLAGS) $(OBJECTS) -o $@

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(EXECUTABLE) $(OBJECTS)
```
