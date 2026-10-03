package ws

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"skillforge/api/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for dev
	},
}

type Client struct {
	UserID string
	Conn   *websocket.Conn
	Send   chan []byte
}

type Manager struct {
	clients    map[string][]*Client // key: UserID
	mu         sync.RWMutex
	redisClient *redis.Client
}

func NewManager(rClient *redis.Client) *Manager {
	m := &Manager{
		clients:     make(map[string][]*Client),
		redisClient: rClient,
	}

	// Start listening to Redis Pub/Sub in background
	go m.listenRedisPubSub()

	return m
}

func (m *Manager) HandleWebSocket(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized WS request"})
		return
	}
	userID := userIDVal.(string)

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade WS connection for user %s: %v", userID, err)
		return
	}

	client := &Client{
		UserID: userID,
		Conn:   conn,
		Send:   make(chan []byte, 256),
	}

	m.registerClient(client)

	log.Printf("WebSocket client connected: User %s", userID)

	// Start writer & reader loops
	go client.writePump(m)
	go client.readPump(m)
}

func (m *Manager) registerClient(client *Client) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.clients[client.UserID] = append(m.clients[client.UserID], client)
}

func (m *Manager) unregisterClient(client *Client) {
	m.mu.Lock()
	defer m.mu.Unlock()

	clients, exists := m.clients[client.UserID]
	if !exists {
		return
	}

	for i, c := range clients {
		if c == client {
			m.clients[client.UserID] = append(clients[:i], clients[i+1:]...)
			close(client.Send)
			client.Conn.Close()
			break
		}
	}

	if len(m.clients[client.UserID]) == 0 {
		delete(m.clients, client.UserID)
	}
	log.Printf("WebSocket client disconnected: User %s", client.UserID)
}

// listenRedisPubSub subscribes to Redis pub/sub channel "submission_updates"
func (m *Manager) listenRedisPubSub() {
	if m == nil || m.redisClient == nil {
		log.Println("Notice: Redis client unavailable for WebSocket pub/sub")
		return
	}

	pubsub := m.redisClient.Subscribe(context.Background(), "submission_updates")
	defer pubsub.Close()

	ch := pubsub.Channel()
	log.Println("Redis Pub/Sub WS subscriber active on channel 'submission_updates'")

	for msg := range ch {
		var wsMsg models.WSMessage
		if err := json.Unmarshal([]byte(msg.Payload), &wsMsg); err != nil {
			log.Printf("Error unmarshalling Redis Pub/Sub payload: %v", err)
			continue
		}

		// Extract target user ID from payload
		if payloadMap, ok := wsMsg.Payload.(map[string]interface{}); ok {
			if targetUserID, ok := payloadMap["user_id"].(string); ok {
				m.SendToUser(targetUserID, []byte(msg.Payload))
			}
		}
	}
}

func (m *Manager) SendToUser(userID string, message []byte) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	clients, exists := m.clients[userID]
	if !exists {
		return
	}

	for _, client := range clients {
		select {
		case client.Send <- message:
		default:
			log.Printf("Buffer full for user %s, dropping message", userID)
		}
	}
}

func (c *Client) readPump(m *Manager) {
	defer func() {
		m.unregisterClient(c)
	}()

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (c *Client) writePump(m *Manager) {
	for message := range c.Send {
		err := c.Conn.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			break
		}
	}
}
