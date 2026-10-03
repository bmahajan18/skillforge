FROM openjdk:21-slim

RUN groupadd -r runner && useradd -r -g runner runner

WORKDIR /app
COPY Runner.java /app/Runner.java
RUN javac /app/Runner.java && chown -R runner:runner /app

USER runner
ENTRYPOINT ["java", "-cp", "/app", "Runner"]
