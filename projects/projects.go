package projects

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProjectFile struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

type Project struct {
	ID          uuid.UUID     `json:"id"`
	UserID      uuid.UUID     `json:"user_id"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Template    string        `json:"template"` // e.g. "go-microservice", "react-app", "python-api"
	Files       []ProjectFile `json:"files"`
	CreatedAt   time.Time     `json:"created_at"`
}

type ProjectManager struct {
	DBPool *pgxpool.Pool
}

func NewProjectManager(pool *pgxpool.Pool) *ProjectManager {
	return &ProjectManager{DBPool: pool}
}

func (p *ProjectManager) CreateProject(c *gin.Context) {
	ctx := c.Request.Context()
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized user"})
		return
	}

	var req struct {
		Name        string        `json:"name" binding:"required"`
		Description string        `json:"description"`
		Template    string        `json:"template" binding:"required"`
		Files       []ProjectFile `json:"files"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	// Default template starter files if empty
	if len(req.Files) == 0 {
		req.Files = []ProjectFile{
			{Path: "main.go", Content: "package main\n\nimport \"fmt\"\n\nfunc main() {\n\tfmt.Println(\"Hello from SkillForge Project!\")\n}\n"},
			{Path: "README.md", Content: fmt.Sprintf("# %s\n\n%s", req.Name, req.Description)},
		}
	}

	filesJSON, _ := json.Marshal(req.Files)
	var proj Project

	err = p.DBPool.QueryRow(ctx, `
		INSERT INTO projects (user_id, name, description, template, files_json)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, name, description, template, files_json, created_at
	`, userID, req.Name, req.Description, req.Template, filesJSON).Scan(
		&proj.ID, &proj.UserID, &proj.Name, &proj.Description, &proj.Template, &filesJSON, &proj.CreatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project"})
		return
	}

	json.Unmarshal(filesJSON, &proj.Files)
	c.JSON(http.StatusCreated, gin.H{"project": proj})
}

func (p *ProjectManager) ListUserProjects(c *gin.Context) {
	ctx := c.Request.Context()
	userIDStr := c.GetString("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized user"})
		return
	}

	rows, err := p.DBPool.Query(ctx, `
		SELECT id, user_id, name, description, template, files_json, created_at
		FROM projects
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch projects"})
		return
	}
	defer rows.Close()

	var list []Project
	for rows.Next() {
		var proj Project
		var filesRaw []byte
		if err := rows.Scan(&proj.ID, &proj.UserID, &proj.Name, &proj.Description, &proj.Template, &filesRaw, &proj.CreatedAt); err != nil {
			continue
		}
		json.Unmarshal(filesRaw, &proj.Files)
		list = append(list, proj)
	}

	c.JSON(http.StatusOK, gin.H{"projects": list})
}
