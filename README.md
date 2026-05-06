# Smart Split Elite

A production-minded expense management platform for group spending, precise split math, settlement planning, and collaborative financial history.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-blue?logo=drizzle)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql)](https://neon.tech/)

---

## Built with AI Agents

This project is also an example of agent-assisted development. The goal was not to use AI as a shortcut, but to use agents for the work they are good at: exploring a large surface area, keeping architectural consistency visible, and rapidly checking changes across UI, service, and database layers.

- **Google Gemini 3.1 Pro & Flash** helped shape high-level architecture and financial logic.
- **Antigravity** supported workspace management, large refactors, and Docker optimization.
- **Code Review Graph** kept structural relationships visible across repositories, services, API routes, and UI.

Why this matters: expense apps are small enough to look simple, but they touch money, membership, permissions, audit history, and derived balances. Agentic development helped keep those concerns connected instead of treating each screen as an isolated UI task.

---

## High-Level Architecture (HLD)

The app follows a clean, layered architecture. UI components call API routes, API routes validate and authorize requests, services own business behavior, repositories isolate persistence, and domain modules handle pure financial calculations.

```mermaid
graph TD
    subgraph "Frontend (Next.js 16)"
        UI[React Components / Pages]
        State[React Hooks / NextAuth]
    end

    subgraph "Application Layer (API Routes)"
        Routes[API Endpoints]
        Validators[Zod Schemas]
        Auth[Auth and Group Access Guards]
    end

    subgraph "Core Business Logic (Services)"
        ExpService[Expense Service]
        GroupService[Group Service]
        SettService[Settlement Service]
        ScoreService[Leaderboard Service]
        Events[Event Bus]
    end

    subgraph "Data Access (Persistence)"
        Repos[Repositories]
        Drizzle[Drizzle ORM]
        DB[(PostgreSQL)]
    end

    subgraph "Integrations"
        Spotify[Spotify Web API]
    end

    UI --> Routes
    Routes --> Validators
    Routes --> Auth
    Auth --> ExpService
    Auth --> GroupService
    Routes --> SettService
    ExpService --> Repos
    GroupService --> Repos
    SettService --> Repos
    Repos --> Drizzle
    Drizzle --> DB
    ExpService -.-> Events
    GroupService -.-> Events
    Events -.-> ActivityLog[Activity Logs]
    ExpService --> Spotify
```

Why this shape: balances and settlements are derived from multiple tables, so keeping calculations and persistence separate makes the math testable. API routes stay thin so authorization and validation are obvious at the boundary.

---

## Features & Benefits

### 1. Financial Precision Engine

- **Problem:** naive splitters lose paise because decimal division rarely divides cleanly.
- **Solution:** the remainder algorithm ensures split totals always match the original expense.
- **Why it matters:** trust is the product. If the ledger is off by even a small amount, users stop trusting the app.

### 2. Multi-Strategy Splitting

- **Options:** `Equal`, `Exact`, `Percentage`, `Exclude`, and `Adjustment`.
- **Why it matters:** real groups are messy. Rent, trips, shared groceries, and one-off reimbursements all need different split models.

### 3. Expense Editing and Deletion

- **Feature:** users can edit expenses and delete an expense inside its group.
- **Behavior:** deleting an expense soft-deletes it with `deleted_at`, so balances ignore it while historical deletion activity can still be recorded.
- **Why it matters:** mistakes happen. Soft deletion protects the ledger from accidental data loss while keeping group totals accurate.

### 4. Group Deletion

- **Feature:** accepted group members can delete a group from the group detail screen after confirmation.
- **Behavior:** the API verifies group membership, then deletes the group. PostgreSQL cascade rules remove memberships, expenses, splits, settlements, attachments, Spotify links, and activity logs tied to that group.
- **Why it matters:** group deletion is intentionally destructive and explicit. Finished trips, test groups, and abandoned groups should not clutter the dashboard forever.

### 5. Min-Transaction Settlement Algorithm

- **Problem:** a group can have many cross-debts even when the final net balance is simple.
- **Solution:** a greedy flow-based algorithm reduces the debt graph into fewer payments.
- **Why it matters:** fewer payments means less social friction and fewer chances for someone to record the wrong settlement.

### 6. Social Integration (Spotify)

- **Feature:** attach a Spotify track to an expense.
- **Why it matters:** shared spending is often tied to shared memories. This keeps the product useful without making the group ledger feel sterile.

### 7. Leaderboard and Gamification

- **Feature:** ranks members based on spending and settlement behavior.
- **Why it matters:** a lightweight score can nudge healthier group behavior without turning settlements into nagging.

---

## Core Workflow

### 1. Group Formation

1. A user creates a group.
2. The system generates a stable join code.
3. Other users join with the code or receive invitations.

Why this exists: join codes remove the need for manual member lookup during trips or shared events, while invitations still work when the creator knows the members in advance.

### 2. Expense Lifecycle

1. Add amount, payer, description, category, and split strategy.
2. Optionally attach a receipt and Spotify track.
3. Edit the expense when details are wrong.
4. Delete the expense when it should no longer affect balances.

Why this exists: expense data changes often. The app treats changes as first-class actions so the balance engine stays accurate without manual recalculation.

### 3. Debt Reconciliation

1. View the generated settlement plan.
2. A payer records a settlement.
3. The receiver confirms receipt.
4. Balances update after confirmation.

Why this exists: confirmed settlement state prevents one person from marking debts resolved unilaterally.

---

## Database Schema (LLD)

```mermaid
erDiagram
    USERS ||--o{ GROUP_MEMBERS : belongs_to
    GROUPS ||--o{ GROUP_MEMBERS : contains
    GROUPS ||--o{ EXPENSES : records
    USERS ||--o{ EXPENSES : pays
    EXPENSES ||--o{ EXPENSE_SPLITS : divided_into
    USERS ||--o{ EXPENSE_SPLITS : owes
    EXPENSES ||--o| EXPENSE_SPOTIFY_TRACKS : has
    EXPENSES ||--o{ EXPENSE_ATTACHMENTS : has
    USERS ||--o{ SETTLEMENTS : sends
    USERS ||--o{ SETTLEMENTS : receives
    GROUPS ||--o{ ACTIVITY_LOGS : audits
```

Why these relations: the schema keeps raw facts separate from derived views. Expenses and splits are stored as source data; balances and settlement plans are computed from that source instead of being duplicated.

Deletion strategy:

- Expenses use soft deletion so group history can record the action and balances can exclude deleted rows.
- Groups use hard deletion with database cascades because a deleted group should disappear completely from dashboards and group-scoped tables.

---

## Tech Stack Rationale

| Layer | Technology | Why | Benefit |
| :--- | :--- | :--- | :--- |
| Framework | Next.js 16 | Full-stack routing, API routes, and production standalone output. | One deployable app with a clean frontend/backend boundary. |
| ORM | Drizzle ORM | SQL-first schema and type-safe queries. | Database code stays explicit and reviewable. |
| Database | PostgreSQL / Neon | Relational constraints fit money, users, groups, and settlements. | Cascades, checks, and transactions protect data integrity. |
| Auth | NextAuth.js | Session management is security-sensitive and should not be hand-rolled. | Standard authentication flow with server-side session access. |
| Validation | Zod | API input must be checked before it reaches services. | Clear 400 responses and safer service contracts. |
| Testing | `tsx --test` + `pg-mem` | Fast tests encourage frequent verification. | Domain logic can be tested without a live database. |
| Deployment | Docker + Compose | Local production-like runs need app, database, and migrations together. | New developers can run the full stack with one command. |

---

## Development Workflow

### Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example` and fill in:

   ```bash
   DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="<32-byte-secret>"
   ```

3. Push the schema:

   ```bash
   npx drizzle-kit push
   ```

4. Run tests:

   ```bash
   npm test
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

Why this workflow: schema push happens before the app starts so runtime failures are not hidden behind missing tables. Tests run before manual QA so split math and service contracts are checked quickly.

### Docker Setup

Run the full stack with:

```bash
docker compose up --build
```

Compose starts:

- `db`: PostgreSQL 16 with a persistent `postgres-data` volume.
- `migrate`: a one-shot Drizzle migration container that waits for Postgres to be healthy.
- `app`: the production Next.js standalone server on `http://localhost:3000`.

Why this setup: the app is not useful without its database schema. Running a migration service before the app keeps container startup deterministic and avoids "works locally, fails in Docker" drift.

Useful Docker commands:

```bash
docker compose ps
docker compose logs -f app
docker compose down
docker compose down -v
```

Use `docker compose down -v` only when you intentionally want to delete the local Postgres data volume.

---

## Verification

Common checks:

```bash
npm test
npm run build
docker compose config
docker compose up --build
```

Why these checks: tests verify domain behavior, build verifies Next.js compilation and server output, compose config catches YAML/environment mistakes, and compose up verifies that the app, database, and migration flow work together.

---

## License

MIT (c) 2026 Abhay Bansal
