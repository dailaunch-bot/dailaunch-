FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npx prisma generate
RUN npx tsc --skipLibCheck --module Node16 --moduleResolution Node16 --target ES2022 --lib ES2022,DOM,DOM.Iterable --outDir ./dist --esModuleInterop --resolveJsonModule
EXPOSE 3001
CMD ["node", "dist/index.js"]
