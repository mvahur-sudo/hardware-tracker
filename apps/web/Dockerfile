FROM node:26.12.1-alpine AS deps
WORKDIR /app
RUN npm install --global pnpm@10.32.1
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --filter web... --frozen-lockfile=false

FROM deps AS build
WORKDIR /app
COPY . .
RUN pnpm --filter web build

FROM node:26.12.1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install --global pnpm@10.32.1
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
