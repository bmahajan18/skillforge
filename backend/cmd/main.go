package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/google/uuid"

	"skillforge/api/internal/auth"
	"skillforge/api/internal/config"
	"skillforge/api/internal/db"
	"skillforge/api/internal/leaderboard"
	"skillforge/api/internal/models"
	"skillforge/api/internal/problems"
	"skillforge/api/internal/queue"
	"skillforge/api/internal/submissions"
	"skillforge/api/internal/ws"

	aifeedback "skillforge/aifeedback"
	analytics "skillforge/analytics"
	projects "skillforge/projects"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

func main() {
	cfg := config.LoadConfig()
	ctx := context.Background()

	log.Printf("Starting SkillForge API Server on port %s...", cfg.Port)

	// 1. Database Connection
	database, err := db.NewDB(ctx, cfg.DBConnString)
	if err != nil {
		log.Fatalf("Database connection error: %v", err)
	}
	defer database.Close()

	// 2. Redis Connection
	rOpts, err := redis.ParseURL("redis://" + cfg.RedisURL)
	var rClient *redis.Client
	if err != nil {
		rClient = redis.NewClient(&redis.Options{Addr: cfg.RedisURL})
	} else {
		rClient = redis.NewClient(rOpts)
	}
	if err := rClient.Ping(ctx).Err(); err != nil {
		log.Printf("Warning: Redis ping failed (%v). Continuing...", err)
	} else {
		log.Println("Connected to Redis successfully")
	}

	// 3. RabbitMQ Connection
	q, err := queue.NewQueue(cfg.RabbitMQURL)
	if err != nil {
		log.Printf("Warning: RabbitMQ connection failed (%v).", err)
	} else {
		defer q.Close()
	}

	// 4. Seed problem catalog
	seedPath := "scripts/seed_problems.json"
	if _, err := os.Stat(seedPath); os.IsNotExist(err) {
		seedPath = "../scripts/seed_problems.json"
	}
	if data, err := os.ReadFile(seedPath); err == nil {
		var seedCatalog []models.Problem
		if err := json.Unmarshal(data, &seedCatalog); err == nil {
			if err := database.SeedProblems(ctx, seedCatalog); err != nil {
				log.Printf("Seed error: %v", err)
			}
		} else {
			log.Printf("Failed to unmarshal seed JSON: %v", err)
		}
	} else {
		log.Printf("Seed file not found at %s: %v", seedPath, err)
	}

	// Handlers & Feature Managers
	authHandler := auth.NewAuthHandler(cfg.JWTSecret)
	wsManager := ws.NewManager(rClient)
	probHandler := problems.NewProblemHandler(database)
	subHandler := submissions.NewSubmissionHandler(database, q)
	leadHandler := leaderboard.NewLeaderboard(rClient)

	// 3 NEW FEATURE MANAGERS
	projManager := projects.NewProjectManager(database.Pool)
	aiEngine := aifeedback.NewAIEngine()
	analyticsSvc := analytics.NewAnalyticsService(database.Pool)

	// Router setup
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOriginFunc:  func(origin string) bool { return true },
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Public Routes
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "service": "skillforge-api"})
	})

	// Explicit Auth Routes (Signup & Login)
	r.POST("/api/auth/register", func(c *gin.Context) {
		var req struct {
			Username string `json:"username" binding:"required"`
			Email    string `json:"email" binding:"required"`
			Password string `json:"password" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username, email, and password required"})
			return
		}

		user, err := database.RegisterUserWithPassword(c.Request.Context(), req.Email, req.Username, req.Password, "https://github.com/identicons/"+req.Username+".png")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		token, err := authHandler.GenerateToken(user.ID, user.Email, user.Username)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to issue token"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"token": token, "user": user})
	})

	r.POST("/api/auth/login", func(c *gin.Context) {
		var req struct {
			Email    string `json:"email" binding:"required"`
			Password string `json:"password" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Email and password required"})
			return
		}

		user, err := database.AuthenticateUser(c.Request.Context(), req.Email, req.Password)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		token, err := authHandler.GenerateToken(user.ID, user.Email, user.Username)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to issue token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"token": token, "user": user})
	})

	r.POST("/api/auth/demo", func(c *gin.Context) {
		user, err := database.UpsertUser(ctx, "bhavya@skillforge.io", "BhavyaCoder", "https://github.com/identicons/bhavya.png")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Demo login failed"})
			return
		}
		token, _ := authHandler.GenerateToken(user.ID, user.Email, user.Username)
		c.JSON(http.StatusOK, gin.H{"token": token, "user": user})
	})

	r.GET("/api/problems", probHandler.ListProblems)
	r.GET("/api/problems/:slug", probHandler.GetProblem)
	r.GET("/api/leaderboard", leadHandler.GetTopLeaderboard)

	// Protected Routes
	protected := r.Group("/api")
	protected.Use(authHandler.AuthMiddleware())
	{
		protected.GET("/auth/me", func(c *gin.Context) {
			userIDStr := c.GetString("user_id")
			userID, err := uuid.Parse(userIDStr)
			if err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid session token"})
				return
			}
			user, err := database.GetUserByID(c.Request.Context(), userID)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"user": user})
		})

		protected.POST("/submissions", subHandler.CreateSubmission)
		protected.GET("/submissions/:id", subHandler.GetSubmission)
		protected.GET("/user/profile", subHandler.GetUserProfileRecord)
		protected.GET("/ws", wsManager.HandleWebSocket)

		// 3 NEW FEATURE ROUTES
		protected.POST("/projects", projManager.CreateProject)
		protected.GET("/projects", projManager.ListUserProjects)
		protected.POST("/ai/analyze", aiEngine.AnalyzeCode)
		protected.GET("/analytics", analyticsSvc.GetUserAnalytics)
	}

	log.Printf("SkillForge API Gateway listening on 0.0.0.0:%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server launch failed: %v", err)
	}
}
