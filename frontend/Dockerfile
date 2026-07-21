# ── Stage 1: build the React app ────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (cached layer if package.json unchanged)
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

# Copy source and build
COPY . .

# Build-time env vars can be passed via --build-arg
# e.g. docker build --build-arg VITE_GOOGLE_MAPS_API_KEY=xxx ...
ARG VITE_GOOGLE_MAPS_API_KEY=""
ARG VITE_AD_ENABLED="false"
ARG VITE_VLM_ENABLED="false"
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY \
    VITE_AD_ENABLED=$VITE_AD_ENABLED \
    VITE_VLM_ENABLED=$VITE_VLM_ENABLED

RUN npm run build


# ── Stage 2: serve with nginx ───────────────────────────────────────────────
FROM nginx:stable-alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Install our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copy the built React app
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
