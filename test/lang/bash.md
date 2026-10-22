```bash
#!/bin/bash
# Test bash skriptu, který by mohl mát Markdown syntaxi
VAR="Toto je **tučný text**."
# Komentář s proměnnou, která obsahuje klíčová slova jiných jazyků
# `import sys` by nemělo být zvýrazněno
if [[ "$VAR" == *"tučný text"* ]]; then
  echo "Found it."
fi

# Zápis do souboru s "testovacím textem"
echo "Test > file.txt"
```