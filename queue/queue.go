package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	amqp "github.com/rabbitmq/amqp091-go"
)

const SubmissionQueueName = "skillforge_submissions"

type QueueService struct {
	Conn    *amqp.Connection
	Channel *amqp.Channel
}

type SubmissionJobPayload struct {
	SubmissionID string      `json:"submission_id"`
	UserID       string      `json:"user_id"`
	ProblemID    string      `json:"problem_id"`
	Language     string      `json:"language"`
	Code         string      `json:"code"`
	TestCases    interface{} `json:"test_cases"`
}

func NewQueueService(url string) (*QueueService, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to open RabbitMQ channel: %w", err)
	}

	_, err = ch.QueueDeclare(
		SubmissionQueueName, // name
		true,                // durable
		false,               // delete when unused
		false,               // exclusive
		false,               // no-wait
		nil,                 // arguments
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to declare queue: %w", err)
	}

	log.Printf("RabbitMQ QueueService ready on queue '%s'", SubmissionQueueName)
	return &QueueService{Conn: conn, Channel: ch}, nil
}

func (q *QueueService) PublishSubmission(ctx context.Context, payload SubmissionJobPayload) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	return q.Channel.PublishWithContext(
		ctx,
		"",                  // exchange
		SubmissionQueueName, // routing key
		false,               // mandatory
		false,               // immediate
		amqp.Publishing{
			DeliveryMode: amqp.Persistent,
			ContentType:  "application/json",
			Body:         body,
		},
	)
}

func (q *QueueService) Close() {
	if q.Channel != nil {
		q.Channel.Close()
	}
	if q.Conn != nil {
		q.Conn.Close()
	}
}
