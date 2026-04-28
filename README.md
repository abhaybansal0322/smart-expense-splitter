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
- **Database**: PostgreSQL (via `pg` node-postgres driver)
- **Validation**: Zod (for type-safe API boundaries)
- **Components**: Modular monolith structure using server-less API route handlers.

## Getting Started

### 1. Database Setup

1. Install and start PostgreSQL.
2. Create a new database:
   ```sql
   CREATE DATABASE expense_splitter;
   ```
3. Run the schema file against your new database to create tables and types:
   ```bash
   psql -U postgres -d expense_splitter -f schema.sql
   ```

### 2. Environment Variables

Create a `.env.local` file in the root of the project (`smart-expense-splitter/.env.local`) and configure your database connection string:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/expense_splitter
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
