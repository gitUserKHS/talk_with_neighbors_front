ARG BUILDPLATFORM
FROM --platform=$BUILDPLATFORM node:26-alpine@sha256:e88a35be04478413b7c71c455cd9865de9b9360e1f43456be5951032d7ac1a66 AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=
ARG VITE_BASE_PATH=/
ARG VITE_KAKAO_MAP_JAVASCRIPT_KEY=
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
ENV VITE_KAKAO_MAP_JAVASCRIPT_KEY=${VITE_KAKAO_MAP_JAVASCRIPT_KEY}
RUN npm run build

FROM nginx:1.30-alpine@sha256:0d3b80406a13a767339fbe2f41406d6c7da727ab89cf8fae399e81f780f814d1
RUN apk upgrade --no-cache
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
