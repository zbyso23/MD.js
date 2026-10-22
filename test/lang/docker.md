```docker
# Dockerfile s komentáři
FROM node:18-alpine
# Nějaký kód s potenciální Markdown syntaxí
# `RUN` by nemělo být chybně označeno
RUN apk update && apk add --no-cache bash

WORKDIR /app
COPY package*.json ./

RUN npm install

# Vnořené uvozovky
CMD ["node", "app.js", "s \"testovacím\" argumentem"]
```