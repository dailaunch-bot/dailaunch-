FROM node:20
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD npx prisma migrate deploy 2>/dev/null || true && npx ts-node --transpile-only src/index.ts
