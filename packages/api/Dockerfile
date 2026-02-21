FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npx prisma generate
RUN npx tsc --skipLibCheck --module commonjs --moduleResolution node --target ES2020 --outDir ./dist --esModuleInterop --resolveJsonModule --lib ES2020
EXPOSE 3001
CMD ["node", "dist/index.js"]
