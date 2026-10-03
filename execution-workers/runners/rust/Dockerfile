FROM rust:1.75-slim

RUN groupadd -r runner && useradd -r -g runner runner

WORKDIR /app
COPY runner.rs /app/runner.rs
RUN rustc -O /app/runner.rs -o /app/runner && chown -R runner:runner /app

USER runner
ENTRYPOINT ["/app/runner"]
