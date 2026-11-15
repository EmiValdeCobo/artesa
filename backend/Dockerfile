FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
RUN pnpm install --filter artesa-backend --frozen-lockfile --prod
COPY backend/src backend/src
WORKDIR /app/backend
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/server.js"]
