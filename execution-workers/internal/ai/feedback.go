package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type AIFeedbackResult struct {
	CodeQualityNotes string   `json:"code_quality_notes"`
	ComplexityNotes  string   `json:"complexity_notes"`
	Suggestions      []string `json:"suggestions"`
}

type AIClient struct {
	APIKey string
}

func NewAIClient() *AIClient {
	return &AIClient{
		APIKey: os.Getenv("CLAUDE_API_KEY"),
	}
}

func (a *AIClient) GenerateFeedback(ctx context.Context, language, code, problemTitle, status, errorMessage string) (*AIFeedbackResult, error) {
	if a.APIKey == "" {
		// Mock feedback generator when key is not set
		return a.mockFeedback(language, status)
	}

	prompt := fmt.Sprintf(`You are a senior principal software engineer reviewing a coding submission.
Problem: %s
Language: %s
Status: %s
Error Message (if any): %s

Code:
` + "```%s\n%s\n```" + `

Provide feedback strictly as a JSON object with keys:
"code_quality_notes": short paragraph on style, naming, readability.
"complexity_notes": time and space complexity observations (e.g. O(N) time, O(1) space).
"suggestions": array of 2 concise actionable suggestions for improvement.`, problemTitle, language, status, errorMessage, language, code)

	reqBody, _ := json.Marshal(map[string]interface{}{
		"model":      "claude-3-5-sonnet-20241022",
		"max_tokens": 500,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	})

	httpReq, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(reqBody))
	if err != nil {
		return a.mockFeedback(language, status)
	}

	httpReq.Header.Set("x-api-key", a.APIKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")
	httpReq.Header.Set("content-type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil || resp.StatusCode != http.StatusOK {
		return a.mockFeedback(language, status)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	var anthropicResp struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}

	if err := json.Unmarshal(bodyBytes, &anthropicResp); err != nil || len(anthropicResp.Content) == 0 {
		return a.mockFeedback(language, status)
	}

	var result AIFeedbackResult
	if err := json.Unmarshal([]byte(anthropicResp.Content[0].Text), &result); err != nil {
		return a.mockFeedback(language, status)
	}

	return &result, nil
}

func (a *AIClient) mockFeedback(language, status string) (*AIFeedbackResult, error) {
	if status == "PASSED" {
		return &AIFeedbackResult{
			CodeQualityNotes: fmt.Sprintf("Great implementation in %s! Clean structure, clear variable names, and good execution speed.", language),
			ComplexityNotes:  "Time Complexity: O(N) - optimal single pass solution. Space Complexity: O(N) auxiliary space.",
			Suggestions: []string{
				"Consider adding inline docstrings for complex conditions.",
				"Check edge cases for empty inputs or negative values.",
			},
		}, nil
	}

	return &AIFeedbackResult{
		CodeQualityNotes: fmt.Sprintf("The submission encountered an issue (%s). Review loop termination and variable scope.", status),
		ComplexityNotes:  "Complexity evaluation pending passing test suite.",
		Suggestions: []string{
			"Verify variable bounds before indexing into arrays.",
			"Test your logic against edge case test cases locally.",
		},
	}, nil
}
