package main

import (
	"context"
	"encoding/json"
	"log"
	"os"

	"skillforge/worker/internal/ai"
	"skillforge/worker/internal/k8s"

	"github.com/jackc/pgx/v5/pgxpool"
	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/redis/go-redis/v9"
)

type SubmissionPayload struct {
	SubmissionID string      `json:"submission_id"`
	UserID       string      `json:"user_id"`
	ProblemID    string      `json:"problem_id"`
	Language     string      `json:"language"`
	Code         string      `json:"code"`
	TestCases    interface{} `json:"test_cases"`
}

func main() {
	log.Println("Starting SkillForge Worker Controller...")
	ctx := context.Background()

	dbConn := getEnv("DATABASE_URL", "postgres://skillforge:skillforge_secret_pass@localhost:5432/skillforge_db?sslmode=disable")
	redisURL := getEnv("REDIS_URL", "localhost:6379")
	rabbitmqURL := getEnv("RABBITMQ_URL", "amqp://skillforge:skillforge_secret_pass@localhost:5672/")

	// 1. Postgres
	dbPool, err := pgxpool.New(ctx, dbConn)
	if err != nil {
		log.Fatalf("Worker failed to connect to DB: %v", err)
	}
	defer dbPool.Close()

	// 2. Redis
	rOpts, err := redis.ParseURL("redis://" + redisURL)
	var rClient *redis.Client
	if err != nil {
		rClient = redis.NewClient(&redis.Options{Addr: redisURL})
	} else {
		rClient = redis.NewClient(rOpts)
	}

	// 3. K8s Executor & AI Client
	executor := k8s.NewExecutor()
	aiClient := ai.NewAIClient()

	// 4. RabbitMQ Consumer
	rabbitConn, err := amqp.Dial(rabbitmqURL)
	if err != nil {
		log.Fatalf("Worker failed to connect to RabbitMQ: %v", err)
	}
	defer rabbitConn.Close()

	ch, err := rabbitConn.Channel()
	if err != nil {
		log.Fatalf("Worker failed to open channel: %v", err)
	}
	defer ch.Close()

	// Ensure queue exists
	q, err := ch.QueueDeclare("skillforge_submissions", true, false, false, false, nil)
	if err != nil {
		log.Fatalf("Worker failed to declare queue: %v", err)
	}

	err = ch.Qos(1, 0, false) // Process 1 job at a time per worker instance
	if err != nil {
		log.Fatalf("Failed to set QoS prefetch: %v", err)
	}

	msgs, err := ch.Consume(
		q.Name, // queue
		"",     // consumer
		false,  // auto-ack (manual ack after execution)
		false,  // exclusive
		false,  // no-local
		false,  // no-wait
		nil,    // args
	)
	if err != nil {
		log.Fatalf("Failed to register consumer: %v", err)
	}

	log.Println("Worker Controller ready and listening for submission jobs...")

	for d := range msgs {
		log.Printf("Received submission job (DeliveryTag: %d)", d.DeliveryTag)

		var payload SubmissionPayload
		if err := json.Unmarshal(d.Body, &payload); err != nil {
			log.Printf("Invalid job payload: %v", err)
			d.Ack(false)
			continue
		}

		// Step A: Publish RUNNING status via Redis Pub/Sub
		publishWSUpdate(ctx, rClient, payload.UserID, payload.SubmissionID, "RUNNING", nil, nil)

		// Step B: Run Execution Job
		res, err := executor.RunSubmissionJob(ctx, payload.SubmissionID, payload.Language, d.Body)
		if err != nil {
			log.Printf("Job execution error: %v", err)
			res = &k8s.ExecutionResult{
				Status:       "RUNTIME_ERROR",
				ErrorMessage: err.Error(),
			}
		}

		// Step C: Update Postgres Submission Record
		_, err = dbPool.Exec(ctx, `
			UPDATE submissions
			SET status = $1, execution_time_ms = $2, output = $3, error_message = $4
			WHERE id = $5
		`, res.Status, res.ExecutionTimeMS, res.Output, res.ErrorMessage, payload.SubmissionID)
		if err != nil {
			log.Printf("Failed to update submission status in DB: %v", err)
		}

		// Step D: Update Leaderboard if PASSED
		if res.Status == "PASSED" {
			var username string
			dbPool.QueryRow(ctx, "SELECT username FROM users WHERE id = $1", payload.UserID).Scan(&username)
			if username != "" {
				rClient.ZIncrBy(ctx, "skillforge_leaderboard", 10.0, username)
			}
		}

		// Step E: Async AI Feedback
		feedback, _ := aiClient.GenerateFeedback(ctx, payload.Language, payload.Code, "Coding Problem", res.Status, res.ErrorMessage)
		if feedback != nil {
			sugJSON, _ := json.Marshal(feedback.Suggestions)
			dbPool.Exec(ctx, `
				INSERT INTO ai_feedback (submission_id, code_quality_notes, complexity_notes, suggestions)
				VALUES ($1, $2, $3, $4)
				ON CONFLICT (submission_id) DO NOTHING
			`, payload.SubmissionID, feedback.CodeQualityNotes, feedback.ComplexityNotes, sugJSON)
		}

		// Step F: Publish final status + AI Feedback to Redis Pub/Sub
		publishWSUpdate(ctx, rClient, payload.UserID, payload.SubmissionID, res.Status, res, feedback)

		// Step G: Ack message
		d.Ack(false)
		log.Printf("Finished submission job %s with status %s", payload.SubmissionID, res.Status)
	}
}

func publishWSUpdate(ctx context.Context, rClient *redis.Client, userID, subID, status string, result *k8s.ExecutionResult, feedback *ai.AIFeedbackResult) {
	wsMsg := map[string]interface{}{
		"type": "STATUS_UPDATE",
		"payload": map[string]interface{}{
			"user_id":       userID,
			"submission_id": subID,
			"status":        status,
			"result":        result,
			"ai_feedback":   feedback,
		},
	}

	msgBytes, _ := json.Marshal(wsMsg)
	rClient.Publish(ctx, "submission_updates", msgBytes)
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
