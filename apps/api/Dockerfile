# Build
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN bunx prisma generate
RUN bun run build

# Run (includes dev deps so bunx prisma migrate deploy works)
FROM oven/bun:1-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/bun.lock ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY prisma.config.ts ./
EXPOSE 3000
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run start:prod"]
