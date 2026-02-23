FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-workspace.yaml ./
COPY packages/dashboard/package.json ./packages/dashboard/
RUN pnpm install --filter @dailaunch/dashboard
COPY packages/dashboard ./packages/dashboard
WORKDIR /app/packages/dashboard
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/dashboard/.next/standalone ./
COPY --from=builder /app/packages/dashboard/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "packages/dashboard/server.js"]
