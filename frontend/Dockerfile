FROM node:22-alpine

WORKDIR /app

# ⭐ บังคับให้ Node.js ใช้ IPv4 ก่อน เพื่อแก้ปัญหา Network Timeout บน Docker Mac
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

COPY package*.json ./
# ⭐ เติม --verbose เพื่อให้เห็น log การทำงาน และ --ignore-scripts เพื่อข้าม nuxt prepare ไปก่อน
RUN npm install --verbose --ignore-scripts

COPY . .

ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "dev"]