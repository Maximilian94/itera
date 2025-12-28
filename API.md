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
Returns questions for practice (question bank). In the MVP, the primary flow is to create an Exam and practice within it.

Query params (optional):
- skillIds (uuid[] as repeat) // e.g.:
  - ?skillIds=<uuid1>&skillIds=<uuid2>
- onlyUnsolved (boolean) // if true, returns only attempted-but-not-yet-solved questions

Response (list):
- questions: [
  {
    id,
    statement,
    skillId,
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
- examId (uuid, optional) // if provided, must belong to user and contain questionId
- questionId (uuid)
- selectedOptionId (uuid)

Response:
- attempt: { id, questionId, selectedOptionId, isCorrect, createdAt }
- feedback:
  - isCorrect (boolean)
  - correctOptionId (uuid)
  - explanationText (string)

Errors:
- 404 question or option not found
- 400 option does not belong to question
- 404 exam not found (if examId provided)
- 403 exam does not belong to user (if examId provided)
- 400 question does not belong to exam (if examId provided)

---

## Exams (protected)

### POST /exams
Creates an exam (a “prova”) by selecting and freezing a set of questions.

Request:
- skillIds (uuid[] as repeat or array in body)
- onlyUnsolved (boolean, optional)
- questionCount (number, optional; default 10)

Response:
- exam: { id, createdAt, questionCount }
- questions: [{ id, statement, skillId, options: [{ id, text }] }]

Errors:
- 400 not enough questions for the requested filters/count

### GET /exams/:id
Fetches a single exam with its frozen questions.

Response:
- exam: { id, createdAt, questionCount }
- questions: [{ id, statement, skillId, options: [{ id, text }] }]

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
  { skillId, skillName, totalAttempts, totalCorrect, accuracy (0..1) }
]

Notes:
- Accuracy is based on attempts (not “last attempt per question”) in MVP.
