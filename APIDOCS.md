# API Documentation — Next In Line

Base URL: `http://localhost:5000/api`

All protected routes require: `Authorization: Bearer <token>`

---

## Auth — Companies

### POST /companies/register
Create a new company account.

**Body:**
```json
{
  "name": "string (required)",
  "email": "string (required)",
  "password": "string (required)"
}
Response (201):

JSON

{
  "success": true,
  "message": "Company registered successfully.",
  "data": {
    "token": "jwt_token",
    "company": { "id": 1, "name": "...", "email": "..." }
  }
}
POST /companies/login
Body:

JSON

{
  "email": "string (required)",
  "password": "string (required)"
}
Response (200):

JSON

{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "jwt_token",
    "company": { "id": 1, "name": "...", "email": "..." }
  }
}
Auth — Applicants
POST /applicants/register
Body:

JSON

{
  "name": "string (required)",
  "email": "string (required)",
  "password": "string (required)"
}
Response (201):

JSON

{
  "success": true,
  "message": "Applicant registered successfully.",
  "data": {
    "token": "jwt_token",
    "applicant": { "id": 1, "name": "...", "email": "..." }
  }
}
POST /applicants/login
Body:

JSON

{
  "email": "string (required)",
  "password": "string (required)"
}
Response (200):

JSON

{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "jwt_token",
    "applicant": { "id": 1, "name": "...", "email": "..." }
  }
}
Jobs
POST /jobs
Create a job opening. Protected — Company only.

Body:

JSON

{
  "title": "string (required)",
  "description": "string (required)",
  "active_capacity": "integer > 0 (required)",
  "decay_window_hours": "integer (optional, default: 48)"
}
Response (201):

JSON

{
  "success": true,
  "message": "Job created successfully.",
  "data": {
    "id": 1,
    "company_id": 1,
    "title": "...",
    "active_capacity": 3,
    "decay_window_hours": 48,
    "status": "open"
  }
}
GET /jobs
Get all jobs for the logged-in company. Protected — Company only.

Response (200):

JSON

{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "...",
      "active_capacity": 3,
      "active_count": "2",
      "waitlist_count": "3"
    }
  ]
}
GET /jobs/:id
Get a single job by ID. Public.

Response (200):

JSON

{
  "success": true,
  "data": {
    "id": 1,
    "title": "...",
    "company_name": "...",
    "active_capacity": 3
  }
}
Applications
POST /applications/jobs/:jobId/apply
Apply to a job. Protected — Applicant only.

Response (201):

JSON

{
  "success": true,
  "message": "Applied successfully. Status: active",
  "data": {
    "id": 1,
    "status": "active",
    "queue_position": null
  }
}
If waitlisted:

JSON

{
  "data": {
    "id": 4,
    "status": "waitlisted",
    "queue_position": 1
  }
}
POST /applications/:id/acknowledge
Acknowledge a promotion. Protected — Applicant only.

Response (200):

JSON

{
  "success": true,
  "message": "Promotion acknowledged successfully.",
  "data": {
    "id": 4,
    "status": "active",
    "acknowledged_at": "2024-01-01T00:00:00Z"
  }
}
POST /applications/:id/withdraw
Withdraw application. Protected — Applicant only.

Triggers auto-promotion if applicant was active.

Response (200):

JSON

{
  "success": true,
  "message": "Withdrawn successfully.",
  "data": { "id": 1, "previousStatus": "active", "status": "withdrawn" }
}
POST /applications/:id/reject
Reject an applicant. Protected — Company only.

Triggers auto-promotion if applicant was active.

Response (200):

JSON

{
  "success": true,
  "message": "Application rejected.",
  "data": { "id": 1, "previousStatus": "active", "status": "rejected" }
}
POST /applications/:id/hire
Hire an applicant. Protected — Company only.

Triggers auto-promotion if applicant was active.

Response (200):

JSON

{
  "success": true,
  "message": "Applicant hired.",
  "data": { "id": 1, "previousStatus": "active", "status": "hired" }
}
GET /applications/status/:jobId
Check application status. Protected — Applicant only.

Response (200):

JSON

{
  "success": true,
  "data": {
    "id": 4,
    "status": "waitlisted",
    "queue_position": 2,
    "decay_level": 1,
    "decay_count": 1
  }
}
GET /applications/jobs/:jobId
View all applications for a job. Protected — Company only.

Response (200):

JSON

{
  "success": true,
  "data": [
    {
      "id": 1,
      "applicant_name": "John",
      "applicant_email": "john@gmail.com",
      "status": "active",
      "decay_level": 0
    }
  ]
}
Error Responses
All errors follow this format:

JSON

{
  "success": false,
  "message": "Error description",
  "data": {}
}
Status Code	Meaning
400	Bad request / validation error
401	Unauthorized / invalid token
403	Forbidden / wrong role
404	Resource not found
500	Server error