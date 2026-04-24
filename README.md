# Next In Line — Hiring Pipeline That Moves Itself

A lightweight internal hiring pipeline management tool built for small engineering teams (5-20 people) who can't afford enterprise ATS platforms like Greenhouse or Lever.

Companies define how many applicants they actively review at once. Everything beyond that waits. When someone exits, the waitlist moves automatically. No spreadsheets. No manual intervention.

---

## Live Demo Flow

1. Company registers and creates a job with active capacity (e.g., 3)
2. Applicants apply — first 3 become active, rest are waitlisted
3. Company rejects or hires an active applicant — next waitlisted person auto-promotes
4. Promoted applicant must acknowledge within the decay window
5. If they do not respond — they decay back to waitlist at a penalized position, next person promotes, cascade continues automatically

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

- Node.js v18 or higher
- PostgreSQL v15 or higher

### Step 1: Clone the repo

```bash
git clone https://github.com/Mukkala-Praneeth/next-in-line.git
cd next-in-line
```

### Step 2: Setup the database

```bash
psql -U postgres
```

Inside psql:

```sql
CREATE DATABASE next_in_line;
\q
```

Then load the schema:

```bash
psql -U postgres -d next_in_line -f server/src/db/schema.sql
```

### Step 3: Configure environment

```bash
cp .env.example server/.env
```

Edit `server/.env`:

```
PORT=5000
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=next_in_line
JWT_SECRET=your_secret_key
DECAY_CHECK_INTERVAL_MS=60000
```

### Step 4: Start the backend

```bash
cd server
npm install
npm run dev
```

### Step 5: Start the frontend

```bash
cd client
npm install
npm run dev
```

Backend runs on `http://localhost:5000`
Frontend runs on `http://localhost:5173`

---

## Testing the Decay System

The default decay window is 48 hours. To test the decay cascade locally in real time:

### Option 1: Create a job with a short decay window

When creating a job on the Company Dashboard, set `Decay Window` to `0.0167` hours (1 minute).

### Option 2: Set a short scheduler interval

In `server/.env`, set:

## Architecture

### Database Schema

```
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
```

### Core Service Layer

All business logic lives in `server/src/services/pipelineService.js` and `server/src/services/decayService.js` — separated from controllers deliberately. Controllers handle only HTTP concerns. Services own all transaction management and state logic.

### Application States

```
[New Application]
       │
       ├── (capacity available) ──► ACTIVE
       │                               │
       │                               ├── hired     ──► HIRED
       │                               ├── rejected  ──► REJECTED
       │                               ├── withdrawn ──► WITHDRAWN
       │                               └── (decay)   ──► WAITLISTED (penalized)
       │
       └── (capacity full) ──► WAITLISTED
                                   │
                                   └── (auto-promoted) ──► ACTIVE
```

---

## Concurrency Handling

**Problem:** Two applications arrive at the exact same time for the last available active slot.

**Solution:** PostgreSQL row-level locking with `SELECT FOR UPDATE` inside explicit transactions.

```sql
BEGIN;
  SELECT * FROM jobs WHERE id = $1 FOR UPDATE;
  -- count active applications
  -- determine if slot is available
  -- insert application with correct status
COMMIT;
```

**How it works:**

1. When an applicant applies, we lock the job row using `FOR UPDATE`
2. Any concurrent application to the same job will wait until the first transaction completes
3. The second transaction then sees the updated active count and correctly assigns waitlisted status
4. This guarantees exactly `active_capacity` applicants are ever active — never more

**For promotions**, we use `SELECT FOR UPDATE SKIP LOCKED` to prevent deadlocks when multiple exits happen simultaneously. If a row is already locked by another promotion, the query skips it and picks the next eligible applicant instead.

**Why not application-level locks?**

- Database-level locks survive process crashes
- They work correctly across multiple server instances
- PostgreSQL MVCC handles this natively and efficiently
- In-memory mutexes would break under horizontal scaling

---

## Inactivity Decay System

### Design Decisions

**Decay Window:** Configurable per job via `decay_window_hours` (default: 48 hours). Different roles can have different urgency levels.

**Decay Penalty:** When an applicant fails to acknowledge their promotion within the window:

- They are NOT removed — they decay back to `waitlisted`
- `decay_count` increments by 1
- `decay_level` increases by `decay_count` (cumulative, accelerating penalty)
- Formula: `new_decay_level = current_decay_level + new_decay_count`

**Example:**

```
First decay:  decay_count=1, decay_level=0+1=1
Second decay: decay_count=2, decay_level=1+2=3
Third decay:  decay_count=3, decay_level=3+3=6
```

Repeat non-responders get pushed further back each time but are never fully removed.

**Waitlist Ordering:**

```sql
ORDER BY decay_level ASC, created_at ASC
```

- Lower decay level = higher priority
- Among same decay level, earlier applicants go first
- More efficient than recalculating explicit integer positions on every decay event

**Cascade Mechanism:**

1. Scheduler runs every 60 seconds (configurable via `DECAY_CHECK_INTERVAL_MS`)
2. Finds all promoted-but-unacknowledged applications past their window
3. For each: decays them, promotes the next person, logs everything
4. If the newly promoted person also does not respond, they get caught in the next cycle
5. Cascade continues automatically with zero manual intervention

**Why setInterval and not a cron library?**

- Challenge rules prohibit third-party scheduling libraries
- setInterval is sufficient for a single-process internal tool
- For production scale: would migrate to pg_cron or a distributed job queue

---

## Audit Trail

Every single state transition is logged in `state_transition_logs`:

```json
{
  "application_id": 4,
  "from_status": "waitlisted",
  "to_status": "active",
  "reason": "auto_promoted",
  "metadata": null,
  "created_at": "2024-01-15T10:30:00Z"
}
```

Decay transitions include structured metadata:

```json
{
  "reason": "inactivity_decay",
  "metadata": {
    "decay_count": 2,
    "new_decay_level": 3,
    "decay_window_hours": 48
  }
}
```

Full pipeline history for any application is reconstructable:

```sql
SELECT * FROM state_transition_logs
WHERE application_id = $1
ORDER BY created_at ASC;
```

---

## Frontend Design Decision

Two views only:

- **Company Dashboard:** Jobs list, full pipeline state per job (active, waitlisted, exited), hire and reject actions
- **Applicant Dashboard:** Apply by job ID, check status, see queue position, acknowledge promotion, withdraw

**Not real-time by design.** Data is fetched on page load and after every user action. Deliberate choice:

- Internal tool for small teams — real-time adds complexity without proportional value
- Polling or WebSockets would be premature optimization for a 5-20 person team
- Every action triggers a fresh fetch so the UI is always accurate at the moment of interaction

---

## Tradeoffs Made

| Decision | Tradeoff | Reasoning |
|----------|----------|-----------|
| PERN over MERN | Less flexible schema | Relational data, row locking, and transactions are critical for queue integrity |
| decay_level ordering vs explicit positions | Requires sort on read | Avoids O(n) position recalculation on every decay event |
| setInterval over pg_cron | Single process only | Meets no-external-library requirement; documented as a known limitation |
| JWT over sessions | Stateless, no server-side store | Simpler for an internal tool; 7-day expiry is acceptable |
| Inline styles over CSS framework | Less maintainable at scale | Frontend is intentionally minimal; a CSS framework would be over-engineering |
| Single DB pool | Connection limit risk at scale | Sufficient for internal tool; pgBouncer would be added for production |

---

## What I Would Change With More Time

1. **Interviewer Assignment** — Distribute active applicants evenly across team members to balance review workload
2. **Email Notifications** — Alert applicants on promotion, approaching decay window, and status changes
3. **WebSocket Integration** — Real-time pipeline updates on the company dashboard
4. **Bulk Actions** — Reject or advance multiple applicants at once
5. **Analytics Dashboard** — Time-in-stage metrics, conversion rates, bottleneck identification
6. **Rate Limiting** — Prevent API abuse with express-rate-limit
7. **Input Sanitization** — Add express-validator for all endpoints
8. **Testing** — Unit tests for pipelineService, integration tests for concurrent submissions
9. **Docker Compose** — One-command local setup with PostgreSQL, backend, and frontend
10. **Graceful Shutdown** — Stop the decay scheduler and drain DB connections on SIGTERM

---

## API Documentation

See [APIDOCS.md](./APIDOCS.md) for complete endpoint documentation with inputs, outputs, and error codes.

---

## Project Structure

```
next-in-line/
├── client/                        # React frontend (Vite)
│   └── src/
│       ├── api/index.js           # Axios instance with auth interceptor
│       ├── pages/
│       │   ├── CompanyLogin.jsx
│       │   ├── CompanyDashboard.jsx
│       │   ├── ApplicantLogin.jsx
│       │   └── ApplicantDashboard.jsx
│       └── App.jsx
├── server/                        # Express backend
│   └── src/
│       ├── controllers/           # HTTP request handlers
│       ├── services/
│       │   ├── pipelineService.js # Application, promotion, exit logic
│       │   └── decayService.js    # Decay checking and acknowledgment
│       ├── routes/                # Route definitions
│       ├── middleware/auth.js     # JWT verification middleware
│       ├── db/
│       │   ├── pool.js            # PostgreSQL connection pool
│       │   └── schema.sql         # Database schema with indexes
│       └── scheduler.js           # Decay interval runner
├── APIDOCS.md                     # Full API documentation
├── .env.example                   # Environment variable template
└── README.md
```
