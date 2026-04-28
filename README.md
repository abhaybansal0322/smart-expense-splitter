# Smart Expense Splitter

A production-ready web application built to solve real-world group expense problems. This system tracks group expenses, computes balances, and provides an optimized settlement plan using a greedy debt-minimization algorithm, complete with direct UPI deep links and QR codes.

## Features

- **Robust Expense Splitter**: Supports `Equal`, `Exact`, `Percentage`, and `Exclude` split types.
- **Settlement Engine**: Calculates the absolute minimum number of transactions needed for the entire group to settle up.
- **UPI Integration**: Generate UPI payment deep links (`upi://pay`) and QR codes dynamically.
- **Real-time UX**: Clean, dark-mode, glassmorphism UI built on Next.js App Router and React.
- **Data Integrity**: Acid-compliant, normalized PostgreSQL schema with penny-perfect arithmetic logic in the backend.

## Architecture & Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4, Vanilla CSS (Design system with custom animations)
- **Database**: PostgreSQL 16+ via Neon (`@neondatabase/serverless` driver)
- **Validation**: Zod (for type-safe API boundaries)
- **Components**: Modular monolith structure using server-less API route handlers.

## Getting Started

### 1. Database Setup (Neon)

1. Go to [Neon.tech](https://neon.tech/) and create a free serverless Postgres project (**PostgreSQL 16** is recommended).
2. In the Neon Console, open the **SQL Editor**.
3. Copy the contents of `schema.sql` from this project and run it in the Neon SQL Editor to create all tables and types.

### 2. Environment Variables

Create a `.env.local` file in the root of the project (`smart-expense-splitter/.env.local`). 

**To get your Neon connection string:**
1. On your Neon Project Dashboard, navigate to the **Connection Details** widget.
2. Ensure you have selected your desired branch (e.g., `main`), database, and role.
3. Check the **Pooled connection** checkbox (highly recommended for Next.js serverless API routes to prevent exhausting database connections).
4. Click the copy icon.

Paste the copied URL into your `.env.local` file. It must include `?sslmode=require` at the end:

```env
DATABASE_URL="postgresql://neondb_owner:password@ep-cold-shadow-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### 3. Install & Run

1. Navigate to the project directory:
   ```bash
   cd smart-expense-splitter
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Core Logic Modules

- `src/services/expenseService.ts`: Contains the `computeSplits` function which carefully manages floating point math and remainders so that all splits perfectly sum up to the total expense amount.
- `src/services/settlementService.ts`: Contains `minimizeTransactions`, the greedy algorithm that resolves a graph of debts into the minimal list of required transfers.

## Design

The UI utilizes a customized, heavily aesthetic dark-theme design system. Components make extensive use of glassmorphism (`backdrop-filter`), CSS variables for semantic theming, micro-animations, and fluid responsive grid layouts to provide a truly premium experience.
