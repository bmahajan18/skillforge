package cacheleaderboardpubsub

import (
	"context"
	"encoding/json"
	"log"

	"github.com/redis/go-redis/v9"
)

const (
	LeaderboardKey       = "skillforge_leaderboard"
	SubmissionUpdatesChan = "submission_updates"
)

type CacheManager struct {
	RedisClient *redis.Client
}

type RankEntry struct {
	Username string  `json:"username"`
	Score    float64 `json:"score"`
	Rank     int64   `json:"rank"`
}

func NewCacheManager(rClient *redis.Client) *CacheManager {
	return &CacheManager{RedisClient: rClient}
}

func (c *CacheManager) IncrementScore(ctx context.Context, username string, points float64) error {
	return c.RedisClient.ZIncrBy(ctx, LeaderboardKey, points, username).Err()
}

func (c *CacheManager) GetTopLeaderboard(ctx context.Context, limit int64) ([]RankEntry, error) {
	res, err := c.RedisClient.ZRevRangeWithScores(ctx, LeaderboardKey, 0, limit-1).Result()
	if err != nil {
		return nil, err
	}

	var leaderboard []RankEntry
	for idx, z := range res {
		leaderboard = append(leaderboard, RankEntry{
			Username: z.Member.(string),
			Score:    z.Score,
			Rank:     int64(idx + 1),
		})
	}
	return leaderboard, nil
}

func (c *CacheManager) PublishEvent(ctx context.Context, eventType string, payload interface{}) error {
	msg := map[string]interface{}{
		"type":    eventType,
		"payload": payload,
	}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	return c.RedisClient.Publish(ctx, SubmissionUpdatesChan, msgBytes).Err()
}

func (c *CacheManager) SubscribeEvents(ctx context.Context, handler func(payload []byte)) {
	pubsub := c.RedisClient.Subscribe(ctx, SubmissionUpdatesChan)
	defer pubsub.Close()

	ch := pubsub.Channel()
	log.Printf("Subscribed to Redis Pub/Sub channel '%s'", SubmissionUpdatesChan)

	for msg := range ch {
		handler([]byte(msg.Payload))
	}
}
