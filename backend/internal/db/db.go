package db

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"skillforge/api/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type DB struct {
	Pool *pgxpool.Pool
}

func NewDB(ctx context.Context, connString string) (*DB, error) {
	pool, err := pgxpool.New(ctx, connString)
	if err != nil {
		return nil, fmt.Errorf("unable to create db pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("unable to ping db: %w", err)
	}

	log.Println("Connected to PostgreSQL successfully")
	return &DB{Pool: pool}, nil
}

func (d *DB) Close() {
	d.Pool.Close()
}

// SeedProblems inserts initial problem set if catalog is empty
func (d *DB) SeedProblems(ctx context.Context, problems []models.Problem) error {
	var count int
	err := d.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM problems").Scan(&count)
	if err != nil {
		return err
	}

	if count > 0 {
		log.Printf("Catalog already contains %d problems. Skipping seed.", count)
		return nil
	}

	log.Println("Seeding problem catalog...")
	for _, p := range problems {
		starterJSON, _ := json.Marshal(p.StarterCode)
		var problemID uuid.UUID

		err := d.Pool.QueryRow(ctx, `
			INSERT INTO problems (slug, title, difficulty, category, description, starter_code)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id
		`, p.Slug, p.Title, p.Difficulty, p.Category, p.Description, starterJSON).Scan(&problemID)

		if err != nil {
			return fmt.Errorf("failed to insert problem %s: %w", p.Slug, err)
		}

		for _, tc := range p.TestCases {
			inputJSON, _ := json.Marshal(tc.Input)
			expectedJSON, _ := json.Marshal(tc.ExpectedOutput)

			_, err := d.Pool.Exec(ctx, `
				INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
				VALUES ($1, $2, $3, $4)
			`, problemID, inputJSON, expectedJSON, tc.IsHidden)

			if err != nil {
				return fmt.Errorf("failed to insert test case for problem %s: %w", p.Slug, err)
			}
		}
	}

	log.Printf("Successfully seeded %d problems into PostgreSQL!", len(problems))
	return nil
}

// RegisterUserWithPassword hashes password with bcrypt and creates user record
func (d *DB) RegisterUserWithPassword(ctx context.Context, email, username, password, avatarURL string) (*models.User, error) {
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	var user models.User
	err = d.Pool.QueryRow(ctx, `
		INSERT INTO users (email, username, avatar_url, password_hash)
		VALUES ($1, $2, $3, $4)
		RETURNING id, email, username, avatar_url, created_at
	`, email, username, avatarURL, string(hashedBytes)).Scan(&user.ID, &user.Email, &user.Username, &user.AvatarURL, &user.CreatedAt)

	if err != nil {
		return nil, fmt.Errorf("user registration failed (email or username already exists): %w", err)
	}

	return &user, nil
}

// AuthenticateUser verifies password hash against stored credentials
func (d *DB) AuthenticateUser(ctx context.Context, email, password string) (*models.User, error) {
	var user models.User
	var storedHash string

	err := d.Pool.QueryRow(ctx, `
		SELECT id, email, username, avatar_url, password_hash, created_at
		FROM users
		WHERE email = $1 OR username = $1
	`, email).Scan(&user.ID, &user.Email, &user.Username, &user.AvatarURL, &storedHash, &user.CreatedAt)

	if err != nil || storedHash == "" {
		return nil, fmt.Errorf("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(password)); err != nil {
		return nil, fmt.Errorf("invalid email or password")
	}

	return &user, nil
}

// GetUserByID fetches user details matching UUID
func (d *DB) GetUserByID(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	var user models.User
	err := d.Pool.QueryRow(ctx, `
		SELECT id, email, username, avatar_url, created_at
		FROM users
		WHERE id = $1
	`, userID).Scan(&user.ID, &user.Email, &user.Username, &user.AvatarURL, &user.CreatedAt)

	if err != nil {
		return nil, fmt.Errorf("user not found")
	}

	return &user, nil
}

// UpsertUser for OAuth / Demo logins
func (d *DB) UpsertUser(ctx context.Context, email, username, avatarURL string) (*models.User, error) {
	var user models.User
	err := d.Pool.QueryRow(ctx, `
		INSERT INTO users (email, username, avatar_url, password_hash)
		VALUES ($1, $2, $3, 'demo_hash')
		ON CONFLICT (email) DO UPDATE 
		SET avatar_url = EXCLUDED.avatar_url
		RETURNING id, email, username, avatar_url, created_at
	`, email, username, avatarURL).Scan(&user.ID, &user.Email, &user.Username, &user.AvatarURL, &user.CreatedAt)

	if err != nil {
		return nil, fmt.Errorf("upsert user failed: %w", err)
	}

	return &user, nil
}

// GetAllProblems returns catalog items without hidden test cases
func (d *DB) GetAllProblems(ctx context.Context) ([]models.Problem, error) {
	rows, err := d.Pool.Query(ctx, `
		SELECT id, slug, title, difficulty, category, description, starter_code, created_at 
		FROM problems 
		ORDER BY title ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.Problem
	for rows.Next() {
		var p models.Problem
		var starterRaw []byte
		if err := rows.Scan(&p.ID, &p.Slug, &p.Title, &p.Difficulty, &p.Category, &p.Description, &starterRaw, &p.CreatedAt); err != nil {
			return nil, err
		}
		json.Unmarshal(starterRaw, &p.StarterCode)
		list = append(list, p)
	}

	return list, nil
}

// GetProblemBySlug returns problem details along with non-hidden test cases
func (d *DB) GetProblemBySlug(ctx context.Context, slug string) (*models.Problem, error) {
	var p models.Problem
	var starterRaw []byte

	err := d.Pool.QueryRow(ctx, `
		SELECT id, slug, title, difficulty, category, description, starter_code, created_at 
		FROM problems 
		WHERE slug = $1
	`, slug).Scan(&p.ID, &p.Slug, &p.Title, &p.Difficulty, &p.Category, &p.Description, &starterRaw, &p.CreatedAt)

	if err != nil {
		return nil, err
	}
	json.Unmarshal(starterRaw, &p.StarterCode)

	// Fetch test cases
	tcRows, err := d.Pool.Query(ctx, `
		SELECT id, problem_id, input, expected_output, is_hidden 
		FROM test_cases 
		WHERE problem_id = $1
	`, p.ID)
	if err != nil {
		return nil, err
	}
	defer tcRows.Close()

	for tcRows.Next() {
		var tc models.TestCase
		var inputRaw, expectedRaw []byte
		if err := tcRows.Scan(&tc.ID, &tc.ProblemID, &inputRaw, &expectedRaw, &tc.IsHidden); err != nil {
			return nil, err
		}
		json.Unmarshal(inputRaw, &tc.Input)
		json.Unmarshal(expectedRaw, &tc.ExpectedOutput)
		p.TestCases = append(p.TestCases, tc)
	}

	return &p, nil
}

// CreateSubmission creates a new submission record in PENDING state
func (d *DB) CreateSubmission(ctx context.Context, userID, problemID uuid.UUID, language, code string) (*models.Submission, error) {
	var sub models.Submission
	err := d.Pool.QueryRow(ctx, `
		INSERT INTO submissions (user_id, problem_id, language, code, status)
		VALUES ($1, $2, $3, $4, 'PENDING')
		RETURNING id, user_id, problem_id, language, code, status, created_at
	`, userID, problemID, language, code).Scan(&sub.ID, &sub.UserID, &sub.ProblemID, &sub.Language, &sub.Code, &sub.Status, &sub.CreatedAt)

	if err != nil {
		return nil, err
	}

	return &sub, nil
}

// GetSubmissionByID returns detailed submission state
func (d *DB) GetSubmissionByID(ctx context.Context, id uuid.UUID) (*models.Submission, error) {
	var sub models.Submission
	var output, errorMsg *string

	err := d.Pool.QueryRow(ctx, `
		SELECT id, user_id, problem_id, language, code, status, execution_time_ms, memory_kb, output, error_message, created_at
		FROM submissions
		WHERE id = $1
	`, id).Scan(&sub.ID, &sub.UserID, &sub.ProblemID, &sub.Language, &sub.Code, &sub.Status, &sub.ExecutionTimeMS, &sub.MemoryKB, &output, &errorMsg, &sub.CreatedAt)

	if err != nil {
		return nil, err
	}

	if output != nil {
		sub.Output = *output
	}
	if errorMsg != nil {
		sub.ErrorMessage = *errorMsg
	}

	return &sub, nil
}

// GetUserProfileRecord retrieves full user stats and submission history
func (d *DB) GetUserProfileRecord(ctx context.Context, userID uuid.UUID) (*models.UserProfileRecord, error) {
	user, err := d.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	var record models.UserProfileRecord
	record.User = *user

	// Solved problems count
	d.Pool.QueryRow(ctx, `
		SELECT COUNT(DISTINCT problem_id) 
		FROM submissions 
		WHERE user_id = $1 AND status = 'PASSED'
	`, userID).Scan(&record.SolvedCount)

	// Submission stats
	var passedCount int
	d.Pool.QueryRow(ctx, `
		SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'PASSED') 
		FROM submissions 
		WHERE user_id = $1
	`, userID).Scan(&record.TotalSubmissions, &passedCount)

	if record.TotalSubmissions > 0 {
		record.AccuracyRate = (float64(passedCount) / float64(record.TotalSubmissions)) * 100.0
	}

	// Fetch detailed submission list
	rows, err := d.Pool.Query(ctx, `
		SELECT 
			s.id, s.user_id, s.problem_id, p.title, p.slug, p.difficulty, 
			s.language, s.code, s.status, s.execution_time_ms, s.memory_kb, 
			s.output, s.error_message, s.created_at
		FROM submissions s
		JOIN problems p ON s.problem_id = p.id
		WHERE s.user_id = $1
		ORDER BY s.created_at DESC
	`, userID)
	if err != nil {
		return &record, nil
	}
	defer rows.Close()

	for rows.Next() {
		var detail models.UserSubmissionDetail
		var output, errorMsg *string
		err := rows.Scan(
			&detail.ID, &detail.UserID, &detail.ProblemID, &detail.ProblemTitle, &detail.ProblemSlug, &detail.ProblemDifficulty,
			&detail.Language, &detail.Code, &detail.Status, &detail.ExecutionTimeMS, &detail.MemoryKB,
			&output, &errorMsg, &detail.CreatedAt,
		)
		if err == nil {
			if output != nil {
				detail.Output = *output
			}
			if errorMsg != nil {
				detail.ErrorMessage = *errorMsg
			}
			record.Submissions = append(record.Submissions, detail)
		}
	}

	return &record, nil
}
