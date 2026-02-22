FROM node:20
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD sh -c "npx prisma migrate deploy 2>/dev/null; npx ts-node --transpile-only src/index.ts"