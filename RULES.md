# ITERA — Business Rules (MVP)

## 1. Correctness Evaluation
- A question has exactly one correct option.
- When user submits (question_id, selected_option_id):
  - verify option belongs to question
  - is_correct = option.is_correct
  - store Attempt with is_correct

## 2. History Filters (Questions)
History filter is defined using user's attempts.

In the MVP API we expose this as a boolean query param:

- onlyUnsolved=true:
  - include questions for which the user has at least one attempt AND no correct attempts
  - (i.e., attempted but not yet solved)

This supports iteration: “practice what I still get wrong”.

## 3. Exams (Provas)
An Exam is a user-owned entity that represents a single “prova” session.

Rules:
- Exam questions are selected once at exam creation time and then frozen.
- A question must not repeat inside the same Exam.
- A question may repeat across different Exams.
- When submitting an Attempt with an exam_id, the API must verify:
  - exam belongs to user
  - question belongs to exam (via ExamQuestion)

## 4. Metrics
Metrics are computed from Attempts (MVP rules):

- overall accuracy = total_correct / total_attempts
- per-skill accuracy = correct_attempts_for_skill / total_attempts_for_skill

MVP uses attempt-based metrics (not “best attempt” or “last attempt”).

## 4. Iteration Loop UX
After an incorrect answer, UI should encourage:
- retry incorrect questions
- continue practicing same skill

No gamification or advanced recommendations in MVP.
