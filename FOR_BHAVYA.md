 # FOR BHAVYA: The SkillForge Engineering Blueprint & Learning Journal 🚀

Welcome to **SkillForge**! This document is your personal, informal, behind-the-scenes guide to how this platform is built, why every architectural choice was made, the mental models used by senior engineers, and the exact lessons (and bugs!) encountered along the way.

---

## 💡 1. What is SkillForge in Plain Language?

Imagine you are running a **high-volume gourmet restaurant** called *SkillForge*:
- **The Customers (Users)** register an account at the host stand (`frontend/src/components/AuthModal.tsx`), then send in custom recipes (code submissions) or full multi-dish menus (`projects/`).
- **The Front-of-House Waiter (`frontend/` & `backend/`)** takes the order, stamps an order ID on it, and sends the customer to a table equipped with a live digital order board (`websockets/`).
- **The Kitchen Order Ticket Queue (`queue/`)** prevents the kitchen from getting flooded when 1,000 customers order simultaneously. Orders sit neatly in line without crashing the kitchen.
- **The Head Chef (`execution-workers/`)** grabs order tickets one by one from the queue.
- Instead of keeping line cooks standing around doing nothing between orders, the Head Chef hires an **ephemeral, isolated Line Cook (Ephemeral Kubernetes Job Container)** specifically for *that single dish*, gives them isolated ingredients, sets a 5-second timer, and isolates them inside a fireproof room (`execution-workers/runners/`).
- As soon as the dish is tasted (test cases pass or fail), the line cook leaves, the fireproof room is destroyed, and the result is broadcast across the restaurant walkie-talkie network (`cache-leaderboard-pubsub/`).
- The customer's digital order board instantly flashes green ("PASSED!") or red ("FAILED!"), and an AI Master Chef (`ai-feedback/`) leans in to whisper time complexity notes and refactoring tips.
- The restaurant manager tracks kitchen throughput and accuracy analytics (`analytics/`).

---

## 🏗️ 2. Domain-Grouped Codebase Layout

```
skillforge/
├── FOR_BHAVYA.md               # You are here! Architectural insights & learning journal.
├── README.md                   # Public portfolio overview & quickstart commands.
│
├── frontend/                   # 1. ALL FRONTEND IN ONE
│   ├── src/app/                # App router pages (catalog, projects, ai-feedback, analytics, leaderboard)
│   ├── src/components/         # Monaco Code Editor, AuthModal (Sign in/up), Header navigation
│   └── src/lib/                # API & WebSocket client helpers
│
├── backend/                    # 2. ALL BACKEND IN ONE
│   ├── cmd/main.go             # API Gateway HTTP entrypoint
│   └── internal/               # Auth (JWT/Registration), problem catalog & submission routes
│
├── websockets/                 # 3. WEBSOCKETS IN ONE
│   └── hub.go                  # WebSocket connection manager & client socket pool router
│
├── cache-leaderboard-pubsub/   # 4. CACHE / LEADERBOARD / PUB-SUB IN ONE
│   └── manager.go              # Redis Sorted Set rankings (ZADD/ZREVRANGE) & PubSub event bridge
│
├── database/                   # 5. DATABASE IN ONE
│   └── init.sql                # PostgreSQL DDL schema (Users, Problems, Submissions, Projects, AI)
│
├── queue/                      # 6. QUEUE IN ONE
│   └── queue.go                # RabbitMQ AMQP persistent message queue integration
│
├── multi-cloud/                # 7. OPTIONAL MULTI-CLOUD TOUCH IN ONE
│   └── terraform.tf            # AWS primary compute/DB + GCP secondary storage Terraform modules
│
├── cicd/                       # 8. CI/CD IN ONE
│   └── pipeline.yml            # GitHub Actions build, test, and container lint workflow
│
├── execution-workers/          # 9. EXECUTION WORKERS IN ONE
│   ├── cmd/main.go             # Queue consumer & execution orchestrator daemon
│   ├── internal/k8s/           # K8s batch/v1 Job launcher using client-go
│   └── runners/                # Python, JS, C++, C, Java, Go, Rust runner harnesses
│
├── infra/                      # 10. INFRA IN ONE
│   ├── docker-compose.yml      # Local dev stack (Postgres 16, Redis 7, RabbitMQ 3)
│   └── k8s/                    # K8s Deployment, Service, and HPA manifests
│
├── projects/                   # 11. CREATE PROJECTS FEATURE IN ONE FOLDER
│   ├── go.mod
│   └── projects.go             # Multi-file project workspace manager (Go, Python, React, Rust templates)
│
├── ai-feedback/                # 12. GET AI FEEDBACK FEATURE IN ONE FOLDER
│   ├── go.mod
│   └── engine.go               # Code Quality score (0-100), Complexity, and Refactoring analyzer
│
└── analytics/                  # 13. SEE ANALYTICS FEATURE IN ONE FOLDER
    ├── go.mod
    └── analytics.go            # Submission accuracy rate (%), latency, & difficulty breakdown
```

---

## 🧠 3. Why These Technologies? (Engineering Rationale)

1. **Go (Golang) for Backend & Workers**:
   - *Why not Node.js or Python?* Kubernetes itself, Docker, Terraform, and Prometheus are all written in Go. Go’s native concurrency (goroutines & channels) allows handling thousands of concurrent WebSocket connections and high-throughput queue consumers with a tiny memory footprint (~15-20MB RAM vs 150MB+ for Node/Java).
2. **Kubernetes Ephemeral Jobs (`batch/v1 Job`) instead of Long-Running Pods**:
   - *Why?* Running untrusted user code inside a long-running pod is a major security risk (what if code spawns a background miner or pollutes shared memory?). K8s Jobs create a fresh container instance per submission that is killed the microsecond execution finishes. This makes K8s scheduling load-bearing and production-realistic.
3. **Redis Pub/Sub for WebSockets**:
   - *The Problem*: When you run multiple replicas of the API server behind a Load Balancer, User A's WebSocket connects to API Pod #1, but Worker Pod #3 processes the submission. How does Pod #3 send a message to Pod #1?
   - *The Solution*: Redis Pub/Sub acts as the universal bridge. Worker Pod #3 publishes `submission:123` to Redis. Pod #1 hears it and relays it down User A's socket.
4. **RabbitMQ / AMQP Message Queue**:
   - *Why?* Prevents cascading backend failures during submission spikes (e.g. a university coding competition). Queue depth metrics directly trigger the K8s Horizontal Pod Autoscaler (HPA) to scale up worker capacity automatically.

---

## 📓 4. Lessons Learned, Pitfalls & Mindset Shift

### Pitfall #1: The Cross-Pod WebSocket Disconnect
- **Problem**: In a horizontally scaled cluster with 5 API Gateway pods, User A's browser WebSocket lands on Pod #2. Worker Pod #4 finishes running the submission job. If Pod #4 tries to push to its own local WebSocket manager, User A never sees the update!
- **Fix**: Decouple WebSockets from worker execution using **Redis Pub/Sub**. Worker Pod #4 publishes the update to Redis channel `submission_updates`. All 5 API Gateway pods listen to this channel; Pod #2 matches `user_id` and relays it to User A's open socket seamlessly.

### Pitfall #2: Container Memory Leaks & Fork Bombs
- **Problem**: What if a user submits `while True: arr.append('A' * 10**6)` or `import os; while True: os.fork()`?
- **Fix**: Enforce hard container constraints at the kernel level inside `batch/v1 Job`:
  1. `Limits: {memory: "128Mi", cpu: "500m"}` (K8s OOMKills memory-hungry processes instantly).
  2. `ActiveDeadlineSeconds: 5` (K8s terminates infinite loops automatically after 5 seconds).
  3. Non-root user `runner` execution so system syscalls are restricted.

### Pitfall #3: Authentication Token Loss & Unhandled Go Package Imports
- **Problem**: 
  1. Frontend page loads were executing a legacy `fetchDemoToken()` call that automatically generated a demo user session, silently overwriting any signed-in user's JWT token in `localStorage` whenever they navigated to a problem page or leaderboard.
  2. In `Header.tsx`, `AuthModal` was instantiated with a dummy `onSuccess={() => {}}` prop, preventing registration and login actions from populating `AuthContext` state.
  3. The Go backend binary crashed on startup due to a missing `"github.com/google/uuid"` import in `backend/cmd/main.go` on `/api/auth/me`.
- **Fix**: 
  1. Refactored `AuthModal.tsx` to directly call `useAuth().login()` and `useAuth().register()`, updating global state and saving `sf_token` / `sf_user` to `localStorage`.
  2. Purged all background `fetchDemoToken()` overwrites across pages and wired `useAuth()` hook throughout the Next.js app.
  3. Added `"github.com/google/uuid"` to `backend/cmd/main.go` imports and restarted the API server on port `8080`.

### Feature Highlight: User Profile & Submissions Records
- **Endpoint**: `GET /api/user/profile` (Protected route requiring JWT token).
- **Functionality**:
  - Calculates unique problems solved (distinct `problem_id` with `status = 'PASSED'`), overall submission count, and accuracy rate (%).
  - Returns a detailed chronological list of all code submissions made by the user, including problem title, difficulty, language, execution time, output, error traces, and exact submitted source code.
  - Interactive frontend `ProfileDrawer.tsx` allows users to click on their profile chip in the top header to inspect past submissions, expand and copy submitted code, and sign out.

---

## 💬 5. How to Talk About This in Engineering Interviews

When an interviewer asks: *"Tell me about a complex cloud backend project you built."*

**Your Answer**:
> "I built **SkillForge** — a sandboxed code execution platform designed to solve the real-world infra challenge of running untrusted code securely at scale across 7 languages (Python, JavaScript, C++, C, Java, Go, Rust).
> 
> Rather than using generic long-running container pods, I engineered the execution layer around **ephemeral Kubernetes `batch/v1` Jobs**, constraining each execution container with 500m CPU, 128MB RAM cgroups, and a 5-second watchdog timer.
> 
> To eliminate client polling, I built a real-time messaging pipeline. When a submission is created, it's pushed to a **RabbitMQ** queue. Worker controllers pull jobs and launch K8s pods. Results are published to a **Redis Pub/Sub** bus, allowing horizontally scaled API gateway replicas to relay live updates (`QUEUED` $\rightarrow$ `RUNNING` $\rightarrow$ `PASSED`) to the user's WebSocket connection.
> 
> I also built multi-file workspace project management (`projects/`), Claude AI code critique analysis (`ai-feedback/`), and submission accuracy/velocity analytics (`analytics/`)."
