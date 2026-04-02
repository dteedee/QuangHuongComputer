# ============================================
# Quang Huong Computer - Frontend Dockerfile
# Multi-stage build: Node build → Nginx serve
# ============================================

# ----- Build Stage -----
FROM node:20-alpine AS build
WORKDIR /app

# Define build arguments for Vite
ARG VITE_API_URL
ARG VITE_NODE_ENV=production
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_FACEBOOK_APP_ID
ARG VITE_CLOUDINARY_CLOUD_NAME
ARG VITE_VNPAY_RETURN_URL
ARG VITE_MOMO_RETURN_URL
ARG VITE_ZALOPAY_RETURN_URL
ARG VITE_SIGNALR_HUB_URL
ARG VITE_SOCKET_URL

# Set env vars for Vite build
ENV VITE_API_URL=$VITE_API_URL \
    VITE_NODE_ENV=$VITE_NODE_ENV \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_FACEBOOK_APP_ID=$VITE_FACEBOOK_APP_ID \
    VITE_CLOUDINARY_CLOUD_NAME=$VITE_CLOUDINARY_CLOUD_NAME \
    VITE_VNPAY_RETURN_URL=$VITE_VNPAY_RETURN_URL \
    VITE_MOMO_RETURN_URL=$VITE_MOMO_RETURN_URL \
    VITE_ZALOPAY_RETURN_URL=$VITE_ZALOPAY_RETURN_URL \
    VITE_SIGNALR_HUB_URL=$VITE_SIGNALR_HUB_URL \
    VITE_SOCKET_URL=$VITE_SOCKET_URL

# Install dependencies (cached layer)
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit --no-fund

# Copy source and build
COPY . .
RUN npm run build

# ----- Production Stage -----
FROM nginx:1.27-alpine AS production

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Security: remove server version header
RUN sed -i 's/# server_tokens off;/server_tokens off;/' /etc/nginx/nginx.conf || true

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
