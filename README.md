## Itera (MVP)

Single repo, no Nx.

### Structure

- `domain/` pure TS rules/types (no framework imports)
- `api/` NestJS (source of truth)
- `web/` Angular (thin client)

### Local dev

In separate terminals:

```bash
cd api
npm run start
```

```bash
cd web
npm start
```

Then open `http://localhost:4200`.

### Database (Phase 1)

For Phase 1 we use **Docker Compose for Postgres only** (API/Web still run locally).

```bash
docker compose up -d
```

Create your API env file:

```bash
cp api/env.sample api/.env
```

Then (from `api/`):

```bash
npm run db:migrate -- --name init --skip-seed
npm run db:seed
```

### UI (Web)

We use **PrimeNG** with theme preset **Aura** for the MVP UI (Phase 3).

### Best practices (project conventions)

- **Env files**
  - Use `api/env.sample` as the committed template.
  - Create your real local file with `cp api/env.sample api/.env`.
  - Never commit secrets in `.env` (it’s ignored by `.gitignore`).

- **RxJS naming**
  - Prefer suffix **`$`** for methods/variables that return an **Observable** (e.g. `login$`, `register$`, `user$`).

- **Parameter Object (Options Object)**
  - Prefer passing parameters as a **single object** for readability and easy evolution:
    - Good: `auth.login$({ email, password })`
    - Avoid: `auth.login$(email, password)`

### Phase 0 check

- API health: `GET http://localhost:3000/health` should return `{ "ok": true }`
- Web home page calls the API health endpoint and renders the JSON.



