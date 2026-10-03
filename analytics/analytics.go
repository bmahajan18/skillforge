package analytics

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AnalyticsStats struct {
	TotalSubmissions int            `json:"total_submissions"`
	PassedCount      int            `json:"passed_count"`
	FailedCount      int            `json:"failed_count"`
	AccuracyRate     float64        `json:"accuracy_rate"` // %
	AvgExecutionMS   float64        `json:"avg_execution_ms"`
	DifficultyCounts map[string]int `json:"difficulty_counts"` // EASY, MEDIUM, HARD
	LanguageCounts   map[string]int `json:"language_counts"`
}

type AnalyticsService struct {
	DBPool *pgxpool.Pool
}

func NewAnalyticsService(pool *pgxpool.Pool) *AnalyticsService {
	return &AnalyticsService{DBPool: pool}
}

func (a *AnalyticsService) GetUserAnalytics(c *gin.Context) {
	ctx := c.Request.Context()
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized user"})
		return
	}

	stats := AnalyticsStats{
		DifficultyCounts: make(map[string]int),
		LanguageCounts:   make(map[string]int),
	}

	// 1. Total & Status counts
	err = a.DBPool.QueryRow(ctx, `
		SELECT 
			COUNT(*),
			COALESCE(SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN status != 'PASSED' THEN 1 ELSE 0 END), 0),
			COALESCE(AVG(execution_time_ms), 0)
		FROM submissions
		WHERE user_id = $1
	`, userID).Scan(&stats.TotalSubmissions, &stats.PassedCount, &stats.FailedCount, &stats.AvgExecutionMS)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate analytics"})
		return
	}

	if stats.TotalSubmissions > 0 {
		stats.AccuracyRate = (float64(stats.PassedCount) / float64(stats.TotalSubmissions)) * 100.0
	}

	// 2. Difficulty Breakdown of Solved Problems
	diffRows, err := a.DBPool.Query(ctx, `
		SELECT p.difficulty, COUNT(DISTINCT s.problem_id)
		FROM submissions s
		JOIN problems p ON s.problem_id = p.id
		WHERE s.user_id = $1 AND s.status = 'PASSED'
		GROUP BY p.difficulty
	`, userID)
	if err == nil {
		for diffRows.Next() {
			var diff string
			var count int
			if diffRows.Scan(&diff, &count) == nil {
				stats.DifficultyCounts[diff] = count
			}
		}
		diffRows.Close()
	}

	// 3. Language Breakdown
	langRows, err := a.DBPool.Query(ctx, `
		SELECT language, COUNT(*)
		FROM submissions
		WHERE user_id = $1
		GROUP BY language
	`, userID)
	if err == nil {
		for langRows.Next() {
			var lang string
			var count int
			if langRows.Scan(&lang, &count) == nil {
				stats.LanguageCounts[lang] = count
			}
		}
		langRows.Close()
	}

	c.JSON(http.StatusOK, gin.H{"analytics": stats})
}
