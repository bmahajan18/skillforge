package config

import (
	"os"
)

type Config struct {
	Port         string
	DBConnString string
	RedisURL     string
	RabbitMQURL  string
	JWTSecret    string
}

func LoadConfig() *Config {
	return &Config{
		Port:         getEnv("PORT", "8080"),
		DBConnString: getEnv("DATABASE_URL", "postgres://skillforge:skillforge_secret_pass@localhost:5432/skillforge_db?sslmode=disable"),
		RedisURL:     getEnv("REDIS_URL", "localhost:6379"),
		RabbitMQURL:  getEnv("RABBITMQ_URL", "amqp://skillforge:skillforge_secret_pass@localhost:5672/"),
		JWTSecret:    getEnv("JWT_SECRET", "skillforge_super_secret_jwt_key_2026"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
