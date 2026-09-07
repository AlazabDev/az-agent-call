FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
RUN npm install -g pnpm@9.15.4
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.app.json tsconfig.server.json vite.config.ts tailwind.config.ts postcss.config.js index.html ./
COPY src ./src
COPY server ./server
COPY shared ./shared
COPY scripts ./scripts
COPY templates ./templates
RUN pnpm build && pnpm prune --prod

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN mkdir -p /app/data && chown -R node:node /app/data
COPY package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/templates ./templates
EXPOSE 3300
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:3300/healthz >/dev/null || exit 1
USER node
CMD ["node", "dist-server/server/index.js"]
