# SkillForge ⚡ Sandboxed Code Execution Platform

> **SkillForge** is a production-grade coding practice platform (mini LeetCode) designed to showcase cloud-native engineering, Kubernetes Job orchestration, real-time WebSockets, and asynchronous queue backpressure handling across **7 programming languages**.

---

## 📁 Domain-Grouped Directory Map

The codebase is organized into **13 distinct domain directories**:

1. 💻 **`frontend/`**: Next.js 14 Web Application (App Router, Monaco Editor, Ultra-Clean Theme, TypeScript).
2. ⚙️ **`backend/`**: Go HTTP API Gateway microservice (REST endpoints, JWT auth, User Sign In/Up).
3. 📡 **`websockets/`**: WebSocket connection manager & client socket pool router.
4. ⚡ **`cache-leaderboard-pubsub/`**: Redis Sorted Set leaderboard ($O(\log N)$ fast rankings) & Pub/Sub event bridge.
5. 🗄️ **`database/`**: PostgreSQL DDL schema (`init.sql`), UUID models, Projects table, and performance indexes.
6. 📥 **`queue/`**: RabbitMQ AMQP persistent message queue publisher and consumer topologies.
7. ☁️ **`multi-cloud/`**: Dual-cloud Infrastructure as Code (AWS primary compute/DB + GCP secondary backup storage Terraform modules).
8. 🚀 **`cicd/`**: GitHub Actions multi-service build, test, and container lint pipeline.
9. 🏃 **`execution-workers/`**: Go Queue Consumer daemon, K8s `batch/v1 Job` launcher, and Python, JS, C++, C, Java, Go, Rust runners.
10. 🏗️ **`infra/`**: Docker Compose local dev stack, Kubernetes Manifests, and Horizontal Pod Autoscaler (HPA) configs.
11. 📁 **`projects/`**: **FEATURE 1: Create Projects** - Multi-file workspace project creation and template builder.
12. 🤖 **`ai-feedback/`**: **FEATURE 2: Get AI Feedback** - Code Quality Score (0-100), Complexity, and Refactoring analyzer.
13. 📊 **`analytics/`**: **FEATURE 3: See Analytics** - Submission accuracy rate (%), execution latency, difficulty breakdown, and language stats.

---

## 🌐 7 Supported Programming Languages

- **Python 3.11** (`python`)
- **JavaScript Node.js 20** (`javascript`)
- **C++ 20 GCC 13** (`cpp`)
- **C 11 GCC 13** (`c`)
- **Java 21 OpenJDK** (`java`)
- **Go 1.22** (`go`)
- **Rust 1.75** (`rust`)

---

## 🚀 Quick Start (Local Development)

### 1. Start Infrastructure Containers (PostgreSQL, Redis, RabbitMQ)
```bash
docker-compose -f infra/docker-compose.yml up -d
```

### 2. Execute SQL Database Migration
```bash
docker exec -i skillforge-postgres psql -U skillforge -d skillforge_db < database/init.sql
```

### 3. Run Go Backend API Gateway
```bash
cd backend
go run cmd/main.go
```

### 4. Run Go Execution Worker Controller
```bash
cd execution-workers
go run cmd/main.go
```

### 5. Run Next.js Frontend Web App
```bash
cd frontend
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 📖 Architectural Deep Dive

For a plain-language breakdown of the architecture, technical decisions, bugs fixed, and engineering mental models, read **[FOR_BHAVYA.md](file:///Users/bhavyamahajan/Desktop/skillforge/FOR_BHAVYA.md)**.
