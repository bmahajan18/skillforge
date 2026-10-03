const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export type SupportedLanguage = 'python' | 'javascript' | 'cpp' | 'c' | 'java' | 'go' | 'rust';

export interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category: string;
  description: string;
  starter_code: {
    python: string;
    javascript: string;
    cpp?: string;
    c?: string;
    java?: string;
    go?: string;
    rust?: string;
  };
  test_cases?: Array<{
    input: any;
    expected_output: any;
    is_hidden: boolean;
  }>;
}

export interface ProjectFile {
  path: string;
  content: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  template: string;
  files: ProjectFile[];
  created_at: string;
}

export interface DetailedAnalysis {
  quality_score: number;
  time_complexity: string;
  space_complexity: string;
  code_smells: string[];
  suggestions: string[];
  summary: string;
}

export interface AnalyticsStats {
  total_submissions: number;
  passed_count: number;
  failed_count: number;
  accuracy_rate: number;
  avg_execution_ms: number;
  difficulty_counts: Record<string, number>;
  language_counts: Record<string, number>;
}

export interface LeaderboardUser {
  username: string;
  score: number;
  rank: number;
}

// Authentication
export async function registerUser(username: string, email: string, password: string): Promise<{ token: string; user: any }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Registration failed');
  }
  return res.json();
}

export async function loginUser(email: string, password: string): Promise<{ token: string; user: any }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Login failed');
  }
  return res.json();
}

export async function getCurrentUser(token: string): Promise<{ user: any }> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Session expired');
  return res.json();
}

export interface UserSubmissionDetail {
  id: string;
  user_id: string;
  problem_id: string;
  problem_title: string;
  problem_slug: string;
  problem_difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  language: SupportedLanguage;
  code: string;
  status: string;
  execution_time_ms: number;
  memory_kb: number;
  output?: string;
  error_message?: string;
  created_at: string;
}

export interface UserProfileRecord {
  user: {
    id: string;
    username: string;
    email: string;
    avatar_url: string;
    created_at: string;
  };
  solved_count: number;
  total_submissions: number;
  accuracy_rate: number;
  submissions: UserSubmissionDetail[];
}

export async function getUserProfile(token: string): Promise<UserProfileRecord> {
  const res = await fetch(`${API_BASE}/user/profile`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user profile');
  const data = await res.json();
  return data.profile;
}

export async function fetchDemoToken(): Promise<{ token: string; user: any }> {
  const res = await fetch(`${API_BASE}/auth/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'BhavyaCoder', email: 'bhavya@skillforge.io' }),
  });
  if (!res.ok) throw new Error('Auth failed');
  return res.json();
}

// Problem Catalog
export async function getProblems(): Promise<Problem[]> {
  const res = await fetch(`${API_BASE}/problems`);
  if (!res.ok) throw new Error('Failed to fetch problems');
  const data = await res.json();
  return data.problems || [];
}

export async function getProblemBySlug(slug: string): Promise<Problem> {
  const res = await fetch(`${API_BASE}/problems/${slug}`);
  if (!res.ok) throw new Error('Problem not found');
  const data = await res.json();
  return data.problem;
}

export async function submitCode(token: string, problemId: string, language: SupportedLanguage, code: string): Promise<{ submission_id: string; status: string }> {
  const res = await fetch(`${API_BASE}/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ problem_id: problemId, language, code }),
  });
  if (!res.ok) throw new Error('Submission failed');
  return res.json();
}

// Feature 1: Create Projects
export async function createProject(token: string, name: string, description: string, template: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ name, description, template }),
  });
  if (!res.ok) throw new Error('Failed to create project');
  const data = await res.json();
  return data.project;
}

export async function getProjects(token: string): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/projects`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch projects');
  const data = await res.json();
  return data.projects || [];
}

// Feature 2: Get AI Feedback
export async function analyzeCodeAI(token: string, language: string, code: string, title: string): Promise<DetailedAnalysis> {
  const res = await fetch(`${API_BASE}/ai/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ language, code, title }),
  });
  if (!res.ok) throw new Error('AI analysis failed');
  const data = await res.json();
  return data.analysis;
}

// Feature 3: See Analytics
export async function getAnalytics(token: string): Promise<AnalyticsStats> {
  const res = await fetch(`${API_BASE}/analytics`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch analytics');
  const data = await res.json();
  return data.analytics;
}

export async function getLeaderboard(): Promise<LeaderboardUser[]> {
  const res = await fetch(`${API_BASE}/leaderboard`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  const data = await res.json();
  return data.leaderboard || [];
}
