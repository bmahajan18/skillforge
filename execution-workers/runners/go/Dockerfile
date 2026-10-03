FROM golang:1.22-alpine

RUN addgroup -S runner && adduser -S runner -G runner

WORKDIR /app
COPY runner.go /app/runner.go
RUN go build -o /app/runner /app/runner.go && chown -R runner:runner /app

USER runner
ENTRYPOINT ["/app/runner"]
