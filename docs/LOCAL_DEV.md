# Running the application locally

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Docker](https://www.docker.com/) and Docker Compose
- [Redis](https://redis.io/) running locally (or via Docker)

---

## 1. Clone the repository

```bash
git clone <repository-url>
cd itera
```

---

## 2. Start the database with Docker Compose

PostgreSQL runs in Docker. The API and frontend run locally.

```bash
docker compose up -d
```

This starts a PostgreSQL 16 instance with the following default credentials:

| Field    | Value     |
|----------|-----------|
| Host     | localhost |
| Port     | 5432      |
| Database | itera     |
| User     | itera     |
| Password | itera     |

---

## 3. Configure API environment variables

```bash
cp api/env.sample api/.env
```

Edit `api/.env` and fill in the required variables:

### Required to run locally

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (already filled in `env.sample`) |
| `PORT` | API port (default: `3000`) |
| `CLERK_SECRET_KEY` | [Clerk](https://clerk.com) secret key (authentication) |
| `CLERK_AUTHORIZED_PARTIES` | Allowed origins for the Clerk JWT (e.g. `http://localhost:4200`) |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk webhook signing secret |
| `REDIS_URL` | Redis URL for the email queue (e.g. `redis://localhost:6379`) |

### Optional (feature-specific)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI — study explanations (GPT-4.1 mini) |
| `XAI_API_KEY` | xAI Grok — feedback and recommendations |
| `NANONETS_API_KEY` | Nanonets — PDF extraction |
| `GCS_BUCKET_NAME` | Google Cloud Storage — question images |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account JSON |
| `STRIPE_SECRET_KEY` | Stripe — secret key (subscriptions) |
| `STRIPE_WEBHOOK_SECRET` | Stripe — webhook secret |
| `STRIPE_PRICE_*` | Stripe price IDs for each plan |
| `RESEND_API_KEY_PROD` | Resend — transactional email |
| `NEXTJS_URL` | Next.js URL for on-demand revalidation |
| `REVALIDATE_SECRET` | Shared secret with Next.js |

---

## 4. Install dependencies

```bash
# API
cd api
npm install
```

```bash
# Web
cd web
npm install
```

> `npm install` in the API automatically generates the Prisma Client via the `postinstall` hook.

---

## 5. Run migrations and seed the database

```bash
cd api
npm run db:migrate -- --name init --skip-seed
npm run db:seed
```

---

## 6. Start the application

### Option 1 — VS Code

Opens API and Web each in their own integrated terminal:

`Cmd+Shift+P` → `Tasks: Run Task` → `dev`

### Option 2 — WebStorm

Opens API and Web each in their own terminal tab:

`Run` menu → `dev` (or use the run configuration selector in the top right)

### Option 3 — Shell script

Opens two separate terminals (Terminal.app on macOS):

```bash
./scripts/dev.sh
```

### Option 4 — Manually

**Terminal 1 — API:**

```bash
cd api
npm run start:dev
```

**Terminal 2 — Web:**

```bash
cd web
npm start
```

---

## 7. Access

| Service      | URL                          |
|--------------|------------------------------|
| Frontend     | http://localhost:4200        |
| API          | http://localhost:3000        |
| Health check | http://localhost:3000/health |

The health check should return `{ "ok": true }`.

---

## Useful commands

### API

| Command | Description |
|---------|-------------|
| `npm run start` | Start the API |
| `npm run start:dev` | Start with hot-reload |
| `npm run start:debug` | Start in debug mode |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio (database GUI) |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |

### Web

| Command | Description |
|---------|-------------|
| `npm start` | Start the development server |
| `npm run build` | Build for production |
| `ng test` | Run tests |
