ARG BUILDPLATFORM
FROM --platform=$BUILDPLATFORM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS builder
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

FROM nginx:1.31-alpine-slim@sha256:45b82ed5f285b90d63df07ba70430fdd8f25624b416617d9e6dc93412b2006dc
RUN apk upgrade --no-cache
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/security-headers.conf /etc/nginx/security-headers.inc
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
