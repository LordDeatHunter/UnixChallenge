FROM oven/bun:1.3.6-alpine AS builder

WORKDIR /app

COPY web/ ./

RUN bun add -g vite
RUN bun install --frozen-lockfile
RUN bun run build

# Deployment with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
