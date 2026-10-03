package problems

import (
	"net/http"

	"skillforge/api/internal/db"

	"github.com/gin-gonic/gin"
)

type ProblemHandler struct {
	DB *db.DB
}

func NewProblemHandler(database *db.DB) *ProblemHandler {
	return &ProblemHandler{DB: database}
}

func (h *ProblemHandler) ListProblems(c *gin.Context) {
	ctx := c.Request.Context()
	list, err := h.DB.GetAllProblems(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch problem catalog"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"problems": list})
}

func (h *ProblemHandler) GetProblem(c *gin.Context) {
	ctx := c.Request.Context()
	slug := c.Param("slug")

	p, err := h.DB.GetProblemBySlug(ctx, slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Problem not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"problem": p})
}
