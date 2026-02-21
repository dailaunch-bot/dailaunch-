FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
RUN npm install -g ts-node typescript
COPY . .
RUN npx prisma generate
RUN npx ts-node --transpile-only --esm src/index.ts &
EXPOSE 3001
CMD ["npx", "ts-node", "--transpile-only", "--esm", "src/index.ts"]
