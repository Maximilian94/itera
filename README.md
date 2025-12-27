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

### Phase 0 check

- API health: `GET http://localhost:3000/health` should return `{ "ok": true }`
- Web home page calls the API health endpoint and renders the JSON.



