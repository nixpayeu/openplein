FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @openplein/runtime build \
 && pnpm --filter @openplein/bridge build:client \
 && cp packages/bridge/dist/plein-client.js apps/demo/miniapps/lijstje/ \
 && cp packages/bridge/dist/plein-client.js apps/demo/miniapps/betalen/ \
 && cp packages/runtime/catalog.prod.json packages/runtime/dist/catalog.json

FROM node:22-alpine
RUN corepack enable
WORKDIR /app
COPY --from=build /app .
EXPOSE 5175
ENV SERVE_STATIC=1
CMD ["pnpm", "--filter", "@openplein/demo-server", "start"]
