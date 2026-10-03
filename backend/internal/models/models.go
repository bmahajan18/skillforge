package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	Username  string    `json:"username"`
	AvatarURL string    `json:"avatar_url"`
	GitHubID  *string   `json:"github_id,omitempty"`
	GoogleID  *string   `json:"google_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type StarterCode struct {
	Python     string `json:"python"`
	JavaScript string `json:"javascript"`
	CPP        string `json:"cpp"`
	C          string `json:"c"`
	Java       string `json:"java"`
	Go         string `json:"go"`
	Rust       string `json:"rust"`
}

type TestCase struct {
	ID             uuid.UUID   `json:"id"`
	ProblemID      uuid.UUID   `json:"problem_id"`
	Input          interface{} `json:"input"`
	ExpectedOutput interface{} `json:"expected_output"`
	IsHidden       bool        `json:"is_hidden"`
}

type Problem struct {
	ID          uuid.UUID   `json:"id"`
	Slug        string      `json:"slug"`
	Title       string      `json:"title"`
	Difficulty  string      `json:"difficulty"` // EASY, MEDIUM, HARD
	Category    string      `json:"category"`
	Description string      `json:"description"`
	StarterCode StarterCode `json:"starter_code"`
	TestCases   []TestCase  `json:"test_cases,omitempty"`
	CreatedAt   time.Time   `json:"created_at"`
}

type Submission struct {
	ID              uuid.UUID   `json:"id"`
	UserID          uuid.UUID   `json:"user_id"`
	ProblemID       uuid.UUID   `json:"problem_id"`
	Language        string      `json:"language"`
	Code            string      `json:"code"`
	Status          string      `json:"status"` // PENDING, QUEUED, RUNNING, PASSED, FAILED, etc.
	ExecutionTimeMS int         `json:"execution_time_ms"`
	MemoryKB        int         `json:"memory_kb"`
	Output          string      `json:"output,omitempty"`
	ErrorMessage    string      `json:"error_message,omitempty"`
	CreatedAt       time.Time   `json:"created_at"`
	AIFeedback      *AIFeedback `json:"ai_feedback,omitempty"`
}

type UserSubmissionDetail struct {
	ID                uuid.UUID `json:"id"`
	UserID            uuid.UUID `json:"user_id"`
	ProblemID         uuid.UUID `json:"problem_id"`
	ProblemTitle      string    `json:"problem_title"`
	ProblemSlug       string    `json:"problem_slug"`
	ProblemDifficulty string    `json:"problem_difficulty"`
	Language          string    `json:"language"`
	Code              string    `json:"code"`
	Status            string    `json:"status"`
	ExecutionTimeMS   int       `json:"execution_time_ms"`
	MemoryKB          int       `json:"memory_kb"`
	Output            string    `json:"output,omitempty"`
	ErrorMessage      string    `json:"error_message,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

type UserProfileRecord struct {
	User             User                   `json:"user"`
	SolvedCount      int                    `json:"solved_count"`
	TotalSubmissions int                    `json:"total_submissions"`
	AccuracyRate     float64                `json:"accuracy_rate"`
	Submissions      []UserSubmissionDetail `json:"submissions"`
}

type AIFeedback struct {
	ID               uuid.UUID `json:"id"`
	SubmissionID     uuid.UUID `json:"submission_id"`
	CodeQualityNotes string    `json:"code_quality_notes"`
	ComplexityNotes  string    `json:"complexity_notes"`
	Suggestions      []string  `json:"suggestions"`
	CreatedAt        time.Time `json:"created_at"`
}

type SubmissionPayload struct {
	SubmissionID string     `json:"submission_id"`
	UserID       string     `json:"user_id"`
	ProblemID    string     `json:"problem_id"`
	Language     string     `json:"language"`
	Code         string     `json:"code"`
	TestCases    []TestCase `json:"test_cases"`
}

type WSMessage struct {
	Type    string      `json:"type"` // "STATUS_UPDATE", "AI_FEEDBACK", "LEADERBOARD_UPDATE"
	Payload interface{} `json:"payload"`
}
