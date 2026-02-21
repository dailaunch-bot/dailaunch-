FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
RUN npm install -g ts-node
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["ts-node", "--transpile-only", "src/index.ts"]
