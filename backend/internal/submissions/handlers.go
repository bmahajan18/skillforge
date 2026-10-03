package submissions

import (
	"net/http"

	"skillforge/api/internal/db"
	"skillforge/api/internal/models"
	"skillforge/api/internal/queue"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SubmissionHandler struct {
	DB    *db.DB
	Queue *queue.Queue
}

type SubmitRequest struct {
	ProblemID string `json:"problem_id" binding:"required"`
	Language  string `json:"language" binding:"required"`
	Code      string `json:"code" binding:"required"`
}

func NewSubmissionHandler(database *db.DB, q *queue.Queue) *SubmissionHandler {
	return &SubmissionHandler{
		DB:    database,
		Queue: q,
	}
}

func (h *SubmissionHandler) CreateSubmission(c *gin.Context) {
	ctx := c.Request.Context()
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user identification"})
		return
	}

	var req SubmitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission payload"})
		return
	}

	problemID, err := uuid.Parse(req.ProblemID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid problem ID format"})
		return
	}

	// Fetch test cases for problem execution
	var p *models.Problem
	// Find problem by ID from DB or slug
	rows, err := h.DB.Pool.Query(ctx, "SELECT slug FROM problems WHERE id = $1", problemID)
	if err != nil || !rows.Next() {
		c.JSON(http.StatusNotFound, gin.H{"error": "Problem not found"})
		return
	}
	var slug string
	rows.Scan(&slug)
	rows.Close()

	p, err = h.DB.GetProblemBySlug(ctx, slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch test cases"})
		return
	}

	// 1. Create DB submission record
	sub, err := h.DB.CreateSubmission(ctx, userID, problemID, req.Language, req.Code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store submission"})
		return
	}

	// 2. Publish payload to RabbitMQ
	payload := models.SubmissionPayload{
		SubmissionID: sub.ID.String(),
		UserID:       userID.String(),
		ProblemID:    problemID.String(),
		Language:     req.Language,
		Code:         req.Code,
		TestCases:    p.TestCases,
	}

	if h.Queue == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Submission queue is currently unavailable"})
		return
	}

	if err := h.Queue.PublishSubmission(ctx, payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to queue execution job"})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"message":       "Submission queued successfully",
		"submission_id": sub.ID,
		"status":        sub.Status,
	})
}

func (h *SubmissionHandler) GetSubmission(c *gin.Context) {
	ctx := c.Request.Context()
	idStr := c.Param("id")
	subID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	sub, err := h.DB.GetSubmissionByID(ctx, subID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"submission": sub})
}

func (h *SubmissionHandler) GetUserProfileRecord(c *gin.Context) {
	ctx := c.Request.Context()
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized session"})
		return
	}

	record, err := h.DB.GetUserProfileRecord(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"profile": record})
}
