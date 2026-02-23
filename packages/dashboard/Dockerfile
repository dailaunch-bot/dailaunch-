FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-workspace.yaml ./
COPY packages/dashboard/package.json ./packages/dashboard/
RUN pnpm install --filter @dailaunch/dashboard
COPY packages/dashboard ./packages/dashboard
WORKDIR /app/packages/dashboard

# Pass NEXT_PUBLIC env vars at build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm build
EXPOSE 3000
CMD ["./node_modules/.bin/next", "start"]
