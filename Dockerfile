FROM oven/bun:1

WORKDIR /app

COPY package.json ./
COPY bun.lockb* ./

RUN bun install
RUN bun add -d nodemon

EXPOSE 5000

CMD ["bun", "run", "dev"]