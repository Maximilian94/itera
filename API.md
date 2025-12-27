# ITERA — API Contract (MVP)

Base URL (dev): http://localhost:<API_PORT>

Auth: Bearer token (JWT or similar)

---

## Auth

### POST /auth/register
Creates a new user.

Request:
- email (string)
- password (string)

Response:
- user: { id, email }
- token (string)

Errors:
- 409 email already exists
- 400 invalid payload

### POST /auth/login
Authenticates user.

Request:
- email (string)
- password (string)

Response:
- user: { id, email }
- token (string)

Errors:
- 401 invalid credentials

---

## Skills (protected)

### GET /skills
Returns all skills.

Response:
- skills: [{ id, name }]

---

## Questions (protected)

### GET /questions
Returns questions for practice.

Query params (optional):
- skill_id (uuid)
- difficulty (Easy|Medium|Hard)
- history (all|correct|incorrect)

Response (list):
- questions: [
  {
    id,
    statement,
    skill_id,
    difficulty,
    options: [{ id, text }]
  }
]

Rules:
- Do NOT return is_correct in options.
- Do NOT return explanation_text here.

---

## Attempts (protected)

### POST /attempts
Submits an answer.

Request:
- question_id (uuid)
- selected_option_id (uuid)

Response:
- attempt: { id, question_id, selected_option_id, is_correct, created_at }
- feedback:
  - is_correct (boolean)
  - correct_option_id (uuid)
  - explanation_text (string)

Errors:
- 404 question or option not found
- 400 option does not belong to question

---

## Metrics (protected)

### GET /metrics
Returns simple user performance metrics based on attempts.

Response:
- overall:
  - total_attempts
  - total_correct
  - accuracy (0..1)
- by_skill: [
  { skill_id, skill_name, total_attempts, total_correct, accuracy (0..1) }
]
- (optional) by_difficulty: [
  { difficulty, total_attempts, total_correct, accuracy (0..1) }
]

Notes:
- Accuracy is based on attempts (not “last attempt per question”) in MVP.
