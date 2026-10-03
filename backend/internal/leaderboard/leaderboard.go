package leaderboard

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

const LeaderboardKey = "skillforge_leaderboard"

type Leaderboard struct {
	RedisClient *redis.Client
}

type RankEntry struct {
	Username string  `json:"username"`
	Score    float64 `json:"score"`
	Rank     int64   `json:"rank"`
}

func NewLeaderboard(rClient *redis.Client) *Leaderboard {
	return &Leaderboard{RedisClient: rClient}
}

func (l *Leaderboard) GetTopLeaderboard(c *gin.Context) {
	ctx := c.Request.Context()

	// Fetch top 50 users by score descending
	res, err := l.RedisClient.ZRevRangeWithScores(ctx, LeaderboardKey, 0, 49).Result()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch leaderboard"})
		return
	}

	var leaderboard []RankEntry
	for idx, z := range res {
		leaderboard = append(leaderboard, RankEntry{
			Username: z.Member.(string),
			Score:    z.Score,
			Rank:     int64(idx + 1),
		})
	}

	c.JSON(http.StatusOK, gin.H{"leaderboard": leaderboard})
}

func (l *Leaderboard) IncrementUserScore(ctx context.Context, username string, points float64) error {
	return l.RedisClient.ZIncrBy(ctx, LeaderboardKey, points, username).Err()
}
