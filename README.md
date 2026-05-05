# Smart Split Elite 💎

A sophisticated, production-grade expense management platform engineered for precision, speed, and collaborative financial tracking.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-blue?logo=drizzle)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql)](https://neon.tech/)

---

## 🤖 Built with AI Agents

This project is a showcase of modern **Agentic Development**. It was built through a collaborative "Pair Programming" session between a human developer and advanced AI agents:
- **Google Gemini 3.1 Pro & Flash**: Used for high-level architecture, complex logic implementation, and real-time debugging.
- **Codex**: Assisted in generating repetitive boilerplate and optimizing SQL queries.
- **Code Review Graph**: Utilized to maintain a mental map of the codebase, ensuring that changes in the database schema (like removing UPI) were correctly propagated through all services and UI components.
- **Antigravity**: The primary agentic orchestrator used to manage the workspace, run builds, and perform large-scale refactors (like the UPI excision and Dockerization).

---

## 🏗️ Architecture & Design Philosophy

This project transcends a simple "Splitwise clone" by implementing industry-standard architectural patterns usually reserved for large-scale enterprise systems.

### 1. The Repository Pattern
We decouple business logic from data access using a **Repository Pattern** (`src/db/repositories/`).
*   **Why?** It ensures that the core services (`src/services/`) remain agnostic of the underlying database driver. This makes the system highly testable with mocks and allows for switching database providers (e.g., from Postgres to PlanetScale) with zero impact on business logic.

### 2. Service Layer Pattern
All financial calculations and complex state transitions live in a dedicated **Service Layer**.
*   **Why?** By keeping API routes thin and moving logic to services, we ensure that the same logic can be reused across Web, CLI, or Background Jobs without duplication.

### 3. Financial Precision Engine
Floating-point math is the enemy of financial apps. Our system uses a precision-first approach for splitting:
*   **Strategy Pattern**: Supports `Equal`, `Exact`, `Percentage`, `Exclude`, and `Adjustment` strategies.
*   **The Remainder Algorithm**: When ₹100 is split among 3 people, our engine ensures the total always sums to ₹100.00 by intelligently handling the 1-paise remainder.

### 4. Min-Transaction Settlement Algorithm
Built on a **Greedy Flow-based Algorithm**, the settlement engine reduces "clutter" by finding the absolute minimum number of transactions needed to zero out all balances within a group.

---

## 🚀 3-Minute Quick Start

Get the production environment running locally in three easy steps.

### 1. Prerequisite: Database
1. Spin up a free PostgreSQL instance on [Neon.tech](https://neon.tech/).
2. Grab your connection string.

### 2. Configure Environment
```bash
cp .env.example .env.local
# Paste your Neon DATABASE_URL into .env.local
```

### 3. Install & Launch
```bash
npm install
npm run dev
```
*Access the app at [localhost:3000](http://localhost:3000)*

---

## 🛠️ Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16** | Leverages React Server Components (RSC) for zero-JS headers and faster LCP. |
| **ORM** | **Drizzle ORM** | Type-safe, SQL-like syntax with nearly zero runtime overhead. |
| **Database** | **PostgreSQL (Neon)** | Scalable, serverless Postgres with instant branching for dev environments. |
| **Auth** | **NextAuth.js** | Secure, flexible authentication supporting both OAuth and Credentials. |
| **Styling** | **Vanilla CSS** | Maximum performance with zero-runtime CSS; custom Glassmorphic design system. |
| **Validation**| **Zod** | Schema-first validation for both API payloads and environment variables. |

---

## 📂 Project Structure

```text
src/
├── app/              # Next.js App Router (Pages & API Routes)
├── components/       # Presentation-layer React components
├── db/               # Drizzle Schema & Repository Layer
│   ├── repositories/ # Abstracted Data Access Objects
│   └── schema.ts     # Single source of truth for the DB schema
├── features/         # Domain-specific UI logic (Dashboard, Expenses, etc.)
├── lib/              # Shared utilities (Formatting, API Handlers)
├── services/         # The "Brain" - Financial logic & Business rules
└── styles/           # Global design system & theme tokens
```

---

## 📜 License
MIT © 2026 Abhay Bansal
