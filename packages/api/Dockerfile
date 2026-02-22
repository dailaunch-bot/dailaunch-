FROM node:20
WORKDIR /app
COPY packages/api/package*.json ./
COPY packages/api/prisma ./prisma/
RUN npm install
COPY packages/api/ .
RUN npx prisma generate
EXPOSE 3001
CMD ["npx", "ts-node", "--transpile-only", "src/index.ts"]
