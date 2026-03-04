FROM mcr.microsoft.com/devcontainers/javascript-node:1-22

RUN npm install -g pnpm@9.15.9

RUN npx playwright install --with-deps chromium

USER node
