FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @openplein/runtime build \
 && pnpm --filter @openplein/bridge build:client \
 && cp packages/bridge/dist/plein-client.js apps/demo/miniapps/lijstje/ \
 && cp packages/bridge/dist/plein-client.js apps/demo/miniapps/betalen/ \
 && cp deploy/tenant.saig.json apps/demo/server/tenant.json

FROM node:24-alpine
RUN corepack enable
WORKDIR /app
COPY --from=build /app .
EXPOSE 5175
ENV SERVE_STATIC=1
ENV TENANT_HOSTNAME=plein.sovereignaigrid.nl
CMD ["pnpm", "--filter", "@openplein/demo-server", "start"]
