# JobTrack 📊

JobTrack is a personal, premium SaaS-style job application tracker designed for modern developers and professionals. Built with React, TypeScript, Tailwind CSS, Express, and MongoDB, it helps job seekers aggregate, manage, and optimize their interview pipeline in a unified, beautiful workspace.

---

## 🚀 Key Features

- **Dashboard Aggregates**: High-level real-time funnel view of total applications, conversion ratios, and critical reminders.
- **Interactive Applications Manager**: Search, sort, and filter applications dynamically by Status, Source, and Priority. Supports instant inline status updates.
- **Saved Jobs Bookmarker**: Clip jobs you find online, and convert them to active applications in one click.
- **Follow-ups reminder dashboard**: Unified timeline categorizing applications into Overdue, Today, Tomorrow, and Upcoming deadlines.
- **One-click Application Duplication**: Clone existing applications instantly (excluding status/history) to speed up multi-role target tracking.
- **CSV Data Portability**: Import your existing tracking spreadsheets or export your full database to CSV/JSON files in one click.
- **Custom Form Template Presets**: Save your preferred application source, priority, and method in Settings to automatically prefill new listings.
- **Dark Mode Support**: Professional interface styling with full dark mode preference detection.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 (Vite-powered)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State & Data Fetching**: TanStack Query (React Query) & Axios
- **Routing**: React Router DOM
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js & Express
- **Language**: TypeScript (`tsc`)
- **Database**: MongoDB (Mongoose ODM)
- **Validation**: Strict schema checks & custom Mongoose middleware for Application History logs.

---

## 📂 Folder Structure

```text
JOB-TRACKER/
├── backend/
│   ├── src/
│   │   ├── config/          # Database & Server configuration
│   │   ├── controllers/     # Route business logic handlers
│   │   ├── models/          # Mongoose database models (Application, History, SavedJob)
│   │   ├── routes/          # Express API route endpoints
│   │   ├── services/        # Service helpers (e.g. Duplication, CSV parsing)
│   │   └── server.ts        # App bootstrapper
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Shared layout, components (Modal, Button, Table, etc.)
│   │   ├── pages/           # Core page views (Dashboard, Applications, Settings, etc.)
│   │   ├── services/        # Axios API clients & types
│   │   ├── App.tsx          # Router configuration
│   │   └── main.tsx
│   ├── tsconfig.json
│   └── package.json
└── README.md
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
Create a `.env` file inside the `backend/` directory:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/jobtrack
```

### Frontend (`frontend/.env`)
Create a `.env` file inside the `frontend/` directory:
```env
VITE_API_URL=http://localhost:5000/api
```

---

## ⚡ Getting Started

### 1. Prerequisite
Ensure you have **Node.js (v18+)** and **MongoDB** (local or Atlas cluster) installed.

### 2. Install Dependencies
Run the installation command in both package folders:
```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 3. Run Locally
Start the development servers concurrently:

**Start Backend:**
```bash
cd backend
npm run dev
```

**Start Frontend:**
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📦 Build Commands

Verify type-safety and compile the applications for production deployment:

```bash
# Build Backend
npm run build --prefix backend

# Build Frontend
npm run build --prefix frontend
```

---

## 🗺️ Future Roadmap

- [ ] **Email Syncing**: Automatically detect application confirmation emails from Gmail.
- [ ] **AI Resume Matcher**: Analyze target job listing requirements against uploaded resumes.
- [ ] **Interactive Kanban View**: Visual drag-and-drop board for active application stages.
- [ ] **Analytics Dashboard**: Interactive charts showing application conversion trends over time.
- [ ] **Chrome Extension**: One-click bookmarking of active listings directly from LinkedIn and Wellfound.
