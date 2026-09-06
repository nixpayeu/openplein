FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @openplein/runtime build \
 && pnpm --filter @openplein/bridge build:client \
 && cp packages/bridge/dist/plein-client.js apps/demo/miniapps/lijstje/ \
 && cp packages/bridge/dist/plein-client.js apps/demo/miniapps/betalen/

FROM node:24-alpine
RUN corepack enable
WORKDIR /app
COPY --from=build /app .
EXPOSE 5175
ENV SERVE_STATIC=1
# Bewust géén tenantconfiguratie en géén TENANT_HOSTNAME hier: dit image is
# tenant-neutraal en draait voor elke klant hetzelfde. De tenantconfiguratie
# wordt bij het starten gemount en TENANT_CONFIG/TENANT_HOSTNAME worden dan
# meegegeven — zie deploy.md.
CMD ["pnpm", "--filter", "@openplein/demo-server", "start"]
