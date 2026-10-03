package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"skillforge/api/internal/models"

	amqp "github.com/rabbitmq/amqp091-go"
)

const QueueName = "skillforge_submissions"

type Queue struct {
	Conn    *amqp.Connection
	Channel *amqp.Channel
}

func NewQueue(url string) (*Queue, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to open RabbitMQ channel: %w", err)
	}

	// Declare durable queue
	_, err = ch.QueueDeclare(
		QueueName, // name
		true,      // durable
		false,     // delete when unused
		false,     // exclusive
		false,     // no-wait
		nil,       // arguments
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to declare queue: %w", err)
	}

	log.Println("Connected to RabbitMQ & declared durable submission queue successfully")
	return &Queue{Conn: conn, Channel: ch}, nil
}

func (q *Queue) PublishSubmission(ctx context.Context, payload models.SubmissionPayload) error {
	if q == nil || q.Channel == nil {
		return fmt.Errorf("queue channel is unavailable")
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal submission payload: %w", err)
	}

	err = q.Channel.PublishWithContext(
		ctx,
		"",        // exchange
		QueueName, // routing key
		false,     // mandatory
		false,     // immediate
		amqp.Publishing{
			DeliveryMode: amqp.Persistent,
			ContentType:  "application/json",
			Body:         body,
		},
	)

	if err != nil {
		return fmt.Errorf("failed to publish message to queue: %w", err)
	}

	log.Printf("Published submission %s to queue %s", payload.SubmissionID, QueueName)
	return nil
}

func (q *Queue) Close() {
	if q.Channel != nil {
		q.Channel.Close()
	}
	if q.Conn != nil {
		q.Conn.Close()
	}
}
