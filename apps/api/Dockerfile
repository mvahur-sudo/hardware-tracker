FROM node:26.12.1-alpine AS deps
WORKDIR /app
RUN npm install --global pnpm@10.32.1
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --filter api... --frozen-lockfile=false

FROM deps AS build
WORKDIR /app
COPY . .
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build

FROM node:26.12.1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install --global pnpm@10.32.1
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --filter api... --prod --frozen-lockfile=false
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["sh", "-c", "pnpm exec prisma generate && pnpm exec prisma migrate deploy && pnpm exec prisma db seed && node dist/main.js"]
