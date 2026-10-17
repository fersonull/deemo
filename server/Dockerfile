# The DEEMO server for a container host (Render; see render.yaml at the repo root). Bun runs the TypeScript directly.
FROM oven/bun:1.3.6-slim

WORKDIR /app
# Dependencies first (cached between deploys). postinstall runs `prisma generate`, which needs the schema and config.
COPY package.json bun.lock prisma.config.ts ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile # dev deps too: postinstall needs the prisma CLI

COPY src ./src
COPY tsconfig.json ./

ENV NODE_ENV=production
# The host sets PORT (Render: 10000); config.ts reads it.
CMD ["bun", "src/main.ts"]
