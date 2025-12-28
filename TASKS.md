# ITERA MVP — TASKS (No Nx, Single Repo)

Repo structure:
- domain/  (pure business rules + types)
- api/     (NestJS + Prisma + Postgres; source of truth)
- web/     (Angular UI; thin client)

Rules:
- Follow SPEC.md strictly.
- Do not add out-of-scope features.
- Keep tasks small and independently testable.

---

## Phase 0 — Repo & Apps Setup

- [x] Create repo folders: domain/, api/, web/
- [x] Initialize NestJS app in api/
- [x] Initialize Angular app in web/
- [x] Configure CORS in api for web dev origin
- [x] Verify both apps run locally

Acceptance:
- API and Web run locally and can communicate (simple health endpoint).

---

## Phase 1 — Database & Prisma (API)

- [x] Add docker-compose Postgres for local dev (DB only; run API/Web locally)
- [x] Add Prisma + Postgres config in api/
- [x] Create Prisma schema for: User, Skill, Question, Option, Attempt
- [x] Run initial migration
- [x] Add seed script with 2–3 skills and 10–20 questions

Acceptance:
- DB tables exist, seed works, questions exist in DB.

---

## Phase 2 — Auth (API)

- [x] Implement register (email + password)
- [x] Implement login (token-based)
- [x] Add auth guard for protected endpoints

Acceptance:
- User can register, login, and access protected routes.

---

## Phase 3 — Core Learning Loop (API)

- [ ] Implement GET /skills
- [ ] Implement GET /questions (filters: skill_id, history)
- [ ] Implement POST /attempts (evaluate correctness, store attempt, return feedback)

Acceptance:
- User can fetch questions, answer one, receive feedback, attempt stored.

---

## Phase 4 — Core Learning Loop (Web)

- [ ] Login/Register pages
- [ ] Practice page:
  - filters (skill, history)
  - list/select question
- [ ] Question page:
  - options selection
  - submit answer
  - show feedback + explanation
  - CTA to retry incorrect questions

Acceptance:
- End-to-end: login → practice → answer → feedback → retry.

---

## Phase 5 — Metrics (API + Web)

- [ ] Implement GET /metrics (overall + per-skill)
- [ ] Create Progress page (simple metrics view)

Acceptance:
- Metrics match attempts stored in DB.

---

## Phase 6 — Minimal Polish

- [ ] Basic dashboard entry point (start practice + quick metrics)
- [ ] Improve iteration CTAs (retry incorrect, continue practicing)

Acceptance:
- UX clearly reinforces “intelligent attempts”.

---

## Explicitly Out of Scope
No admin CRUD, no videos, no per-option explanations, no marketplace, no community, no AI.
