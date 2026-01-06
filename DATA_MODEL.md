# ITERA — Data Model (MVP)

This model is generic and subject-agnostic.

## Entities

### User

- id (uuid)
- email (unique)
- password_hash
- created_at

### Skill

- id (uuid)
- name
- created_at

Notes:

- MVP uses a single vertical implicitly; do not model Vertical yet unless needed.
- Skills are the primary way to organize practice.

### Question

- id (uuid)
- statement (text)
- skill_id (FK -> Skill)
- explanation_text (text)  // one general explanation
- created_at

### Option

- id (uuid)
- question_id (FK -> Question)
- text (string)
- is_correct (boolean)
- created_at

Constraints:

- Each Question must have >= 2 Options.
- Each Question must have exactly 1 Option where is_correct = true.

### Attempt

- id (uuid)
- user_id (FK -> User)
- exam_id (FK -> ExamService, nullable in MVP for backward compatibility)
- question_id (FK -> Question)
- selected_option_id (FK -> Option)
- is_correct (boolean)
- created_at

Constraints:

- Attempts are append-only (no updates in MVP).
- Multiple attempts per (user_id, question_id) are allowed.

### ExamService

- id (uuid)
- user_id (FK -> User)
- created_at
- filter_skill_ids (uuid[]) // stores the filter the user selected when creating the exam (optional but useful)
- only_unsolved (boolean)   // stores the filter the user selected (optional but useful)
- question_count (int)

Notes:

- An ExamService is a “snapshot” of a set of questions chosen at creation time.
- Exams let us reproduce and review a specific “prova” later.

### ExamQuestion

- exam_id (FK -> ExamService)
- question_id (FK -> Question)
- order (int)

Constraints:

- Each Question can appear at most once per ExamService.
- Order is defined at creation time.

---

## Relationships

- Skill 1 — N Question
- Question 1 — N Option
- User 1 — N Attempt
- Question 1 — N Attempt
- Option 1 — N Attempt (selected option)
- User 1 — N ExamService
- ExamService 1 — N ExamQuestion
- Question 1 — N ExamQuestion
- ExamService 1 — N Attempt (optional link)

---

## MVP Simplifications

- No Vertical table yet (single vertical implied).
- Explanation is stored on Question (text only).
- No per-option explanations.
