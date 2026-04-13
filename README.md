# Next In Line — Hiring Pipeline That Moves Itself

A lightweight internal hiring pipeline management tool built for small engineering teams (5-20 people) who can't afford enterprise ATS platforms like Greenhouse or Lever.

Companies define how many applicants they actively review at once. Everything beyond that waits. When someone exits, the waitlist moves automatically. No spreadsheets. No manual intervention.

---

## Live Demo Flow

1. Company registers → creates a job with active capacity (e.g., 3)
2. Applicants apply → first 3 become "active", rest are "waitlisted"
3. Company rejects/hires an active applicant → next waitlisted person auto-promotes
4. Promoted applicant must acknowledge within the decay window
5. If they don't respond → they decay back to waitlist at a penalized position → next person promotes → cascade continues automatically

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | PostgreSQL |
| Backend | Express.js (Node.js) |
| Frontend | React (Vite) |
| Auth | JWT + bcrypt |
| Scheduling | Pure setInterval (no third-party libraries) |

---

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v15+)

### Step 1: Clone and install

```bash
git clone <your-repo-url>
cd next-in-line
Step 2: Setup database
Bash

psql -U postgres
CREATE DATABASE next_in_line;
\q
psql -U postgres -d next_in_line -f server/src/db/schema.sql
Step 3: Configure environment
Bash

cp .env.example server/.env
Edit server/.env with your PostgreSQL credentials:

text

PORT=5000
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=next_in_line
JWT_SECRET=your_secret_key
DECAY_CHECK_INTERVAL_MS=60000
Step 4: Start backend
Bash

cd server
npm install
npm run dev
Step 5: Start frontend
Bash

cd client
npm install
npm run dev
Backend runs on http://localhost:5000
Frontend runs on http://localhost:5173

Architecture
Database Schema
text

companies (id, name, email, password_hash)
    │
    └── jobs (id, company_id, title, active_capacity, decay_window_hours, status)
            │
            └── applications (id, job_id, applicant_id, status, decay_level, 
                              decay_count, promoted_at, acknowledged_at)
                    │
                    └── state_transition_logs (id, application_id, from_status, 
                                               to_status, reason, metadata)

applicants (id, name, email, password_hash)
    │
    └── applications (linked via applicant_id)
Core Service Layer
All business logic lives in server/src/services/pipelineService.js and server/src/services/decayService.js — separated from controllers. Controllers handle HTTP concerns only. Services handle transactions and state management.

Application States
text

[New Application]
       │
       ├── (capacity available) ──► ACTIVE
       │                               │
       │                               ├── hired ──► HIRED
       │                               ├── rejected ──► REJECTED
       │                               ├── withdrawn ──► WITHDRAWN
       │                               └── (decay) ──► WAITLISTED (penalized)
       │
       └── (capacity full) ──► WAITLISTED
                                   │
                                   └── (auto-promoted) ──► ACTIVE
Concurrency Handling
Problem: Two applications arrive at the exact same time for the last available active slot.

Solution: PostgreSQL row-level locking with SELECT ... FOR UPDATE inside explicit transactions.

SQL

BEGIN;
  SELECT * FROM jobs WHERE id = $1 FOR UPDATE;  -- locks the job row
  -- count active applications
  -- determine if slot available
  -- insert application
COMMIT;
How it works:

When an applicant applies, we lock the job row using FOR UPDATE
Any concurrent application to the same job will wait until the first transaction completes
The second transaction then sees the updated active count and correctly assigns waitlisted status
This guarantees exactly active_capacity applicants are ever active — never more
For promotions, we use SELECT FOR UPDATE SKIP LOCKED to prevent deadlocks when multiple exits happen simultaneously. If a row is already locked by another promotion, the query skips it and picks the next eligible applicant.

Why not application-level locks?

Database-level locks are more reliable than in-memory mutexes
They survive process crashes
They work across multiple server instances
PostgreSQL's MVCC handles this efficiently
Inactivity Decay System
Design Decisions
Decay Window: Configurable per job via decay_window_hours (default: 48 hours). This lets companies set different urgency levels per role.

Decay Penalty: When an applicant fails to acknowledge their promotion within the window:

They are NOT removed — they decay back to waitlisted
decay_count increments by 1
decay_level increases by decay_count (cumulative penalty)
Formula: new_decay_level = current_decay_level + new_decay_count
Example:

text

First decay:  decay_count=1, decay_level=0+1=1
Second decay: decay_count=2, decay_level=1+2=3
Third decay:  decay_count=3, decay_level=3+3=6
This creates an accelerating penalty — repeat non-responders get pushed further back each time, but they're never removed entirely.

Waitlist Ordering: ORDER BY decay_level ASC, created_at ASC

Applicants with lower decay levels are promoted first
Among same decay level, earlier applicants go first
This is more efficient than recalculating integer positions for every applicant
Cascade Mechanism:

Scheduler runs every 60 seconds (configurable via DECAY_CHECK_INTERVAL_MS)
Finds all promoted-but-unacknowledged applications past their window
For each: decays them → promotes next person → logs everything
If the next promoted person also doesn't respond, they'll be caught in the next cycle
This creates an automatic cascade without manual intervention
Why setInterval and not a cron library?

Challenge rules prohibit third-party scheduling libraries
setInterval is sufficient for a single-process internal tool
For production: would use pg_cron or a distributed job queue
Audit Trail
Every single state transition is logged in state_transition_logs:

JSON

{
  "application_id": 4,
  "from_status": "waitlisted",
  "to_status": "active",
  "reason": "auto_promoted",
  "metadata": null,
  "created_at": "2024-01-15T10:30:00Z"
}
Decay transitions include metadata:

JSON

{
  "reason": "inactivity_decay",
  "metadata": {
    "decay_count": 2,
    "new_decay_level": 3,
    "decay_window_hours": 48
  }
}
The entire pipeline history can be reconstructed by querying:

SQL

SELECT * FROM state_transition_logs 
WHERE application_id = $1 
ORDER BY created_at ASC;
Frontend Design Decision
The frontend is intentionally minimal — two views:

Company Dashboard: Shows all jobs, pipeline state (active/waitlisted/exited), hire/reject buttons
Applicant Dashboard: Enter job ID, check status, see queue position, acknowledge promotions, withdraw
Not real-time by design. Data is fetched on page load and on user actions (button clicks). This is a deliberate choice:

Internal tool for small teams — real-time adds complexity without proportional value
Polling or WebSockets would be premature optimization for 5-20 person teams
Every action triggers a fresh fetch, so the UI is always accurate when interacted with
Tradeoffs Made
Decision	Tradeoff	Reasoning
PERN over MERN	Less flexible schema	Relational data, transactions, and row locking are critical for queue integrity
decay_level ordering vs explicit positions	Requires sorting on read	Avoids O(n) position recalculation on every decay event
setInterval over pg_cron	Single process only	Meets the no-external-library requirement; documented as limitation
JWT over sessions	Stateless, no server-side session store	Simpler for an internal tool; tokens expire in 7 days
Inline styles over CSS framework	Less maintainable	Frontend is minimal; a CSS framework would be over-engineering
Single database pool	Connection limit risk	Sufficient for internal tool scale; would add connection pooling (pgBouncer) at scale
What I'd Change With More Time
Interviewer Assignment: Distribute active applicants evenly across team members for review, balancing workload automatically
Email Notifications: Notify applicants when promoted, approaching decay window, or when status changes
WebSocket Integration: Real-time pipeline updates on the company dashboard
Bulk Actions: Reject/advance multiple applicants at once
Analytics Dashboard: Time-in-stage metrics, conversion rates, bottleneck identification
Rate Limiting: Prevent API abuse with express-rate-limit
Input Sanitization: Add express-validator for all endpoints
Testing: Unit tests for pipelineService, integration tests for concurrent applications
Docker Compose: One-command setup with PostgreSQL + backend + frontend
Graceful Shutdown: Stop the decay scheduler and close DB connections on SIGTERM
API Documentation
See APIDOCS.md for complete endpoint documentation with request/response examples.

Project Structure
text

next-in-line/
├── client/                     # React frontend (Vite)
│   └── src/
│       ├── api/index.js        # Axios instance with auth interceptor
│       ├── pages/
│       │   ├── CompanyLogin.jsx
│       │   ├── CompanyDashboard.jsx
│       │   ├── ApplicantLogin.jsx
│       │   └── ApplicantDashboard.jsx
│       └── App.jsx
├── server/                     # Express backend
│   └── src/
│       ├── controllers/        # HTTP request handlers
│       ├── services/           # Core business logic
│       │   ├── pipelineService.js  # Application, promotion, exit logic
│       │   └── decayService.js     # Decay checking + acknowledgment
│       ├── routes/             # Route definitions
│       ├── middleware/auth.js  # JWT verification
│       ├── db/
│       │   ├── pool.js         # PostgreSQL connection pool
│       │   └── schema.sql      # Database schema
│       └── scheduler.js        # Decay check interval runner
├── APIDOCS.md                  # API endpoint documentation
└── README.md