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
- difficulty (enum: Easy | Medium | Hard)
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
- question_id (FK -> Question)
- selected_option_id (FK -> Option)
- is_correct (boolean)
- created_at

Constraints:
- Attempts are append-only (no updates in MVP).
- Multiple attempts per (user_id, question_id) are allowed.

---

## Relationships
- Skill 1 — N Question
- Question 1 — N Option
- User 1 — N Attempt
- Question 1 — N Attempt
- Option 1 — N Attempt (selected option)

---

## MVP Simplifications
- No Vertical table yet (single vertical implied).
- Explanation is stored on Question (text only).
- No per-option explanations.
