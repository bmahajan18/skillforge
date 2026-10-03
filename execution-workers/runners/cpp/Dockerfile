FROM gcc:13

RUN groupadd -r runner && useradd -r -g runner runner

WORKDIR /app
COPY runner.cpp /app/runner.cpp
RUN g++ -O3 /app/runner.cpp -o /app/runner && chown -R runner:runner /app

USER runner
ENTRYPOINT ["/app/runner"]
