# ITERA — Conventions (MVP)

## Repo Structure
- domain/  pure TS rules/types (no framework imports)
- api/     NestJS + Prisma + Postgres
- web/     Angular client

## Naming
- REST endpoints use plural resources: /questions, /attempts, /skills
- Use consistent casing:
  - JSON: snake_case OR camelCase (pick one and stick to it; recommended: camelCase)

## Backend (NestJS)
- Modules by feature:
  - auth, skills, questions, attempts, metrics
- Controllers are thin:
  - validate inputs
  - call services
- Services contain application logic
- Prisma access isolated (service or repository pattern; keep it consistent)

## Frontend (Angular)
- Keep UI thin: fetch from API and render
- Avoid duplicating business logic from backend
- Use a single API client service per resource or a shared HttpClient wrapper

## Error Handling (API)
- Use consistent error shape:
  - message
  - code (optional)
- Use correct HTTP codes:
  - 400 validation
  - 401 auth
  - 403 forbidden
  - 404 not found
  - 409 conflict

## AI Guardrails (Cursor)
- Always read SPEC.md, TASKS.md, API.md before implementing
- Do not add features outside MVP
- Keep changes small and scoped to the current task
- List modified files in every change request
