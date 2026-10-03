FROM node:20-alpine

# Security: Create non-root user
RUN addgroup -S runner && adduser -S runner -G runner

WORKDIR /app

COPY runner.js /app/runner.js

RUN chown -R runner:runner /app

USER runner

ENTRYPOINT ["node", "/app/runner.js"]
