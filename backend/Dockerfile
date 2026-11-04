FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
RUN pnpm install --filter artesa-backend --frozen-lockfile --prod
COPY backend/src ./src
EXPOSE 3000
CMD ["node", "src/server.js"]
