FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
RUN npm install esbuild --save-dev
COPY . .
RUN npx prisma generate
RUN npx esbuild src/index.ts --bundle=false --platform=node --target=node20 --outdir=dist --format=cjs
EXPOSE 3001
CMD ["node", "dist/index.js"]
