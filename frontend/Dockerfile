FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ── Development (hot-reload) ──────────────────────────────
FROM base AS development
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ── Builder ───────────────────────────────────────────────
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# ── Production (standalone output) ───────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
