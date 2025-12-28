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

## Phase 3 — Web Auth UI + PrimeNG (Aura)

Goal: get an end-to-end loop early (Web → API auth → protected routes) with a consistent UI kit.

- [x] Install PrimeNG + PrimeIcons + animations
- [x] Configure PrimeNG theme preset: Aura
- [x] Create /login and /register pages (PrimeNG)
- [x] Implement web AuthService calling API:
  - POST /auth/register
  - POST /auth/login
- [x] Store token in localStorage (MVP) and attach Authorization header via HttpInterceptor
- [x] Add simple route guard for protected pages

Acceptance:
- User can register/login in the Web UI, token is stored, and protected route access works.

---

## Phase 4 — Core Learning Loop (API)

- [x] Implement GET /skills
- [x] Implement GET /questions (filters: skillIds, onlyUnsolved) (question bank)
- [x] Implement POST /exams (create exam from filters; freeze selected questions)
- [x] Implement GET /exams/:id (fetch exam + frozen questions)
- [x] Update POST /attempts to optionally accept examId and validate question belongs to exam
- [x] Implement POST /attempts (evaluate correctness, store attempt, return feedback)

Acceptance:
- User can create an exam, fetch its questions, answer one, receive feedback, attempt stored (linked to exam).

---

## Phase 5 — Core Learning Loop (Web)

- [x] Login/Register pages
- [x] Practice page:
  - filters (skillIds, onlyUnsolved)
  - create exam
  - list/select question
- [x] Question page:
  - options selection
  - submit answer (with examId)
  - show feedback + explanation
  - next question / finish

Acceptance:
- End-to-end: login → practice → answer → feedback → retry.

---

## Phase 6 — Metrics (API + Web)

- [ ] Implement GET /metrics (overall + per-skill)
- [ ] Create Progress page (simple metrics view)

Acceptance:
- Metrics match attempts stored in DB.

---

## Phase 7 — Minimal Polish

- [ ] Basic dashboard entry point (start practice + quick metrics)
- [ ] Improve iteration CTAs (retry incorrect, continue practicing)

Acceptance:
- UX clearly reinforces “intelligent attempts”.

---

## Explicitly Out of Scope
No admin CRUD, no videos, no per-option explanations, no marketplace, no community, no AI.
