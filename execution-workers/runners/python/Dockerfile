FROM python:3.11-slim

# Security: Create non-root user
RUN groupadd -r runner && useradd -r -g runner runner

WORKDIR /app

COPY runner.py /app/runner.py

RUN chown -R runner:runner /app

USER runner

ENTRYPOINT ["python", "-u", "/app/runner.py"]
