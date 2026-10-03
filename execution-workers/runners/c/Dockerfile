FROM gcc:13

RUN groupadd -r runner && useradd -r -g runner runner

WORKDIR /app
COPY runner.c /app/runner.c
RUN gcc -O3 /app/runner.c -o /app/runner && chown -R runner:runner /app

USER runner
ENTRYPOINT ["/app/runner"]
