FROM node:20
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 8080
ENV PORT=8080
CMD ["npx", "ts-node", "--transpile-only", "src/index.ts"]