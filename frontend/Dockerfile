FROM node:18 AS build-stage
WORKDIR /app

# common 서브모듈 복사
COPY common/frontend ./common/frontend

# frontend 복사 (node_modules 제외를 위해 개별 복사)
COPY frontend/package*.json ./
RUN npm install

# 소스 코드만 복사 (node_modules, dist 제외)
COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/babel.config.js frontend/tsconfig.json frontend/vue.config.js ./

RUN npm run build

FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
