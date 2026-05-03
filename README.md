# Smart Expense Splitter

A high-performance, production-ready web application designed to simplify group expense management. Smart Expense Splitter combines precision financial logic with modern social features like photo sharing and Spotify integration, all wrapped in a premium, glassmorphic UI.

---

## 🤖 Built with AI Agents
This project is a showcase of modern **Agentic Development**. It was built through a collaborative "Pair Programming" session between a human developer and advanced AI agents:
- **Google Gemini 3.1 Pro & Flash**: Used for high-level architecture, complex logic implementation, and real-time debugging.
- **Codex**: Assisted in generating repetitive boilerplate and optimizing SQL queries.
- **Code Review Graph**: Utilized to maintain a mental map of the codebase, ensuring that changes in the database schema (like removing UPI) were correctly propagated through all services and UI components.
- **Antigravity**: The primary agentic orchestrator used to manage the workspace, run builds, and perform large-scale refactors (like the UPI excision and Dockerization).

---

## ✨ Core Features

### 💰 Financial Precision
- **Advanced Expense Splitting**: Supports `Equal`, `Exact`, `Percentage`, `Exclude`, and `Itemized (Adjustment)` strategies.
- **Penny-Perfect Arithmetic**: Handles floating-point remainders so splits always sum exactly to the total.
- **Optimized Settlement Engine**: A greedy algorithm that finds the absolute minimum transactions needed to settle all group debts.

### 📸 Social & Fun
- **Photo Attachments**: Upload receipts or group memories (up to 4 per expense).
- **Spotify Integration**: Attach songs to expenses to set the group "vibe."
- **Smart Leaderboard**: Gamified ranking based on spending and settlement reliability.

---

## 📂 File Structure (A Beginner's Guide)

If you're new to the project, here is a map of where everything lives and what it does:

### 🌐 Frontend (The UI)
- `src/app/`: The "Heart" of the Next.js App Router.
  - `layout.tsx`: The global wrapper (Navbar, Fonts, SEO Metadata).
  - `page.tsx`: The landing dashboard where you see your groups.
  - `groups/[id]/page.tsx`: The main "Group View" showing expenses, balances, and settlements.
- `src/components/`: Reusable building blocks.
  - `AddExpenseModal.tsx`: The complex form for entering expenses, photos, and Spotify songs.
  - `SettlementCard.tsx`: The UI for confirming payments between friends.
  - `Navbar.tsx`: The top navigation bar.

### ⚙️ Backend (The Logic)
- `src/services/`: Where the "Math" happens.
  - `expenseService.ts`: Calculates exactly how much each person owes based on the split type.
  - `settlementService.ts`: The algorithm that minimizes the number of payments needed to clear debts.
  - `spotifyService.ts`: Communicates with Spotify to fetch track data.
- `src/app/api/`: Server-side endpoints (The "API").
  - `expenses/route.ts`: Handles creating and deleting expenses in the database.
  - `settlements/route.ts`: Manages the "Handshake" when someone confirms a payment.
- `src/lib/`: Shared utilities.
  - `db.ts`: The bridge between the code and the PostgreSQL database.
  - `auth.ts`: Configuration for NextAuth (Login/Security).

### 🗃️ Database & Config
- `schema.sql`: The blueprint for the database. If you want to see how data is stored, look here.
- `docker-compose.yml`: Instructions for Docker to package the whole app into a single "container."

---

## 🚀 Getting Started

### 1. Database Setup
1. Create a project at [Neon.tech](https://neon.tech/).
2. Run the SQL in `schema.sql` using the Neon SQL Editor.

### 2. Environment Configuration
Create a `.env.local` file:
```env
DATABASE_URL="your-neon-url-here"
NEXTAUTH_SECRET="random-secret-string"
SPOTIFY_CLIENT_ID="optional"
SPOTIFY_CLIENT_SECRET="optional"
```

### 3. Local Development
```bash
npm install
npm run dev
```

### 4. Running with Docker
```bash
docker-compose up -d --build
```
