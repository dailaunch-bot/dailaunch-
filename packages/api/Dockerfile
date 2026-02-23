FROM node:20
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npx prisma generate
RUN npx tsc
EXPOSE 8080
ENV PORT=8080
CMD ["node", "dist/index.js"]