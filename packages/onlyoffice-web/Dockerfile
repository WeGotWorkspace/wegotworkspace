# ============================================================
# Global build arguments (declared before any FROM so they can
# be used in FROM lines; must be re-declared inside each stage
# to be visible there).
# ============================================================

# OnlyOffice DocumentServer version — controls both the source image
# tag AND the versioned asset directory prefix (/v<DS_VERSION>-<HASH>).
ARG DS_VERSION=9.3.1

# Revision counter. Bump this (--build-arg HASH=2) whenever you want
# to bust the browser cache for the OnlyOffice assets without changing
# the DocumentServer version itself.
ARG HASH=1

# ============================================================
# Stage 1: OnlyOffice DocumentServer assets source
# ============================================================
FROM onlyoffice/documentserver:${DS_VERSION} AS documentserver

# AllFonts.js and themes.js are NOT present in the image — they are
# generated at container startup by documentserver-generate-allfonts.sh.
# We run that script here (passing `false` so it skips the data-container
# wait branch) so the files exist before the COPY in the final stage.
RUN documentserver-generate-allfonts.sh false

# ============================================================
# Stage 2: Next.js website builder
# ============================================================
FROM node:22-alpine AS builder

# Re-declare args inside this stage to make them visible here.
ARG DS_VERSION
ARG HASH

# Expose the versioned asset path to Next.js at build time.
ENV NEXT_PUBLIC_APP_ROOT=/v${DS_VERSION}-${HASH}

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependency manifests first for better layer caching.
COPY package.json pnpm-lock.yaml ./

# Install dependencies (frozen lockfile for reproducibility).
RUN pnpm install --frozen-lockfile

# Copy the rest of the source code.
COPY . .

# Run the Next.js static export build.
RUN pnpm build

# ============================================================
# Stage 3: Caddy production server
# ============================================================
FROM caddy:2-alpine AS final

# Re-declare args inside this stage.
ARG DS_VERSION
ARG HASH

WORKDIR /srv

# Copy the Next.js static export output.
COPY --from=builder /app/out ./

# Copy OnlyOffice DocumentServer assets directly from the source stage
# into the versioned directory — assets never pass through the builder,
# so there is no redundant copy of the large asset tree.
COPY --from=documentserver /var/www/onlyoffice/documentserver/fonts         ./v${DS_VERSION}-${HASH}/fonts
COPY --from=documentserver /var/www/onlyoffice/documentserver/sdkjs         ./v${DS_VERSION}-${HASH}/sdkjs
COPY --from=documentserver /var/www/onlyoffice/documentserver/web-apps      ./v${DS_VERSION}-${HASH}/web-apps
COPY --from=documentserver /var/www/onlyoffice/documentserver/sdkjs-plugins ./v${DS_VERSION}-${HASH}/sdkjs-plugins

# api.js is generated from a template at runtime in a full DocumentServer
# deployment, but here we serve it statically — copy the template as-is.
RUN cp "./v${DS_VERSION}-${HASH}/web-apps/apps/api/documents/api.js.tpl" \
       "./v${DS_VERSION}-${HASH}/web-apps/apps/api/documents/api.js"

# Copy Caddyfile.
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443
