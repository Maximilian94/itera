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

### Phase 0 check

- API health: `GET http://localhost:3000/health` should return `{ "ok": true }`
- Web home page calls the API health endpoint and renders the JSON.



