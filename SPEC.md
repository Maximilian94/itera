# ITERA — Product Specification (MVP)

## 1. Product Vision

**Itera** is a generic learning platform based on questions and answers, built on the principle:

> **Perfection comes from intelligent attempts.**

Users learn by iterating:
> answer → fail/succeed → understand → try again → improve

The platform is **subject-agnostic** and supports multiple **verticals** (niches).
In the MVP, only **one vertical** is active, but the architecture must support multiple verticals later.

---

## 2. MVP Goal

Validate that users:

- Learn effectively through question practice
- Value immediate feedback with explanations
- Use simple metrics to guide what to practice next
- Return to retry incorrect questions (iteration loop)

Not validating in MVP:

- Open contributions / community content
- Royalties / marketplace
- Video explanations
- AI recommendations
- Native mobile apps

---

## 3. Core Iteration Loop

The MVP must support the loop:

1) User selects exam filters
2) System creates an ExamService (a “prova”) and freezes the selected questions
3) User answers a question inside the ExamService
4) System evaluates correctness
5) System returns feedback + explanation
6) User retries incorrect questions (often by creating a new ExamService with onlyUnsolved=true)
7) User checks progress (simple)

Every MVP feature must reinforce this loop.

---

## 4. MVP Scope (Features)

### 4.1 Questions

Each question has:

- statement
- multiple choice options (exactly one correct)
- primary skill
- one general explanation (text only)

### 4.2 Answering

Users can:

- create an exam (with filters)
- fetch the exam questions
- answer questions
- get immediate feedback (correctness + correct option + explanation)

### 4.3 Attempts

For each answer, store:

- user_id
- exam_id (when answering inside an exam)
- question_id
- selected_option_id
- is_correct
- created_at

Multiple attempts per question are allowed.

### 4.4 History & Iteration

Users can:

- create exams using history filter: all / only incorrect (attempted but not yet solved)
- retry incorrect questions

### 4.5 Metrics (simple)

Show:

- overall accuracy
- accuracy per skill

---

## 5. Minimal User Management

- email + password authentication
- protected API routes

---

## 6. Explicitly Out of Scope (MVP)

- explanation per option
- video explanations
- comments/community features
- open contribution workflow
- royalties/marketplace
- gamification/leaderboards
- advanced simulations
- AI-driven recommendations
- native mobile apps

---

## 7. Architecture Principles

- Backend is the source of truth for business rules.
- Frontend is a thin client consuming the API.
- Keep business logic reusable for future mobile clients.
- Keep the platform generic and data-driven.

---

## 8. MVP Definition of Done

A user can:

1) Register and log in
2) Create an exam with filters (skillIds, onlyUnsolved)
3) Answer exam questions and see feedback + explanation
4) Create a new exam for retrying incorrect questions
5) See overall progress and skill-level accuracy
