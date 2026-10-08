FROM node:22-bookworm AS node
FROM mcr.microsoft.com/playwright:v1.63.0-noble@sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27
COPY --from=node /usr/local/ /usr/local/
WORKDIR /app
COPY package.json package-lock.json ./
COPY vendor/ vendor/
RUN npm ci
COPY . .
ENV PRISMIC_CONTENT_MODE=snapshot ASTRO_TELEMETRY_DISABLED=1
CMD ["npm", "run", "coverage:quiz"]
