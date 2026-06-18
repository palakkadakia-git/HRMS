FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/

# ── Development (hot-reload) ──────────────────────────────
FROM base AS development
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["npm", "run", "start:dev"]

# ── Builder ───────────────────────────────────────────────
FROM base AS build
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Production ────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY package*.json ./
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
