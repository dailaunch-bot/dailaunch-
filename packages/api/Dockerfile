FROM node:20
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN echo "cache-bust-1" && npx prisma generate
EXPOSE 3001
CMD ["npx", "ts-node", "--transpile-only", "src/index.ts"]
