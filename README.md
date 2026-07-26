# ApplyBlitz 🚀

A full-stack **Job Application Tracker & Automation** app that helps you send 50+ job applications per day with AI-tailored resumes and cover letters.

---

## Features

| Page | What it does |
|---|---|
| **Dashboard** | Daily goal progress (X/50), streak tracker, 7-day bar chart, pipeline status, salary tracker, upcoming interviews |
| **Find Jobs** | Search across multiple Indian job sources (JSearch, Adzuna, Jooble), match score badges, Quick Apply, Batch Apply, Save jobs |
| **My Applications** | Table + Kanban view, inline status/notes/interview scheduling, bulk AI re-tailor, CSV export |
| **AI Tailor** | Paste any job description → tailored resume + cover letter + ATS match score |
| **Resume Analyzer** | Deep ATS analysis — section scores, keyword gaps, strengths, priority improvements, auto-saved score history with trend chart |
| **Profile** | Name, target roles/locations, years of experience, skills, base resume text, salary range, LinkedIn URL |
| **Settings** | Daily goal, dry run mode, API key status |

---

## Stack

- **Monorepo**: pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui (dark theme) + Recharts
- **Backend**: Express 5 (Node.js)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (zod/v4), drizzle-zod
- **API codegen**: Orval (OpenAPI → React Query hooks + Zod schemas)

---

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 9+
- PostgreSQL database (set `DATABASE_URL`)

### Install & run

```bash
pnpm install

# Push DB schema
pnpm --filter @workspace/db run push

# Start API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Start frontend (port auto-assigned)
pnpm --filter @workspace/apply-blitz run dev
```

### Optional API Keys (app works without them)

| Key | Purpose |
|---|---|
| `OPENAI_API_KEY` | Real AI resume/cover letter tailoring (GPT-4o). Falls back to smart mock. |
| `RAPIDAPI_KEY` | JSearch job search API. Falls back to 20 realistic mock jobs. |
| `ADZUNA_APP_ID` + `ADZUNA_API_KEY` | Adzuna India job source (free tier: 250 req/month) |
| `JOOBLE_API_KEY` | Jooble India job source (free API) |

---

## Project Structure

```
artifacts/
  api-server/           # Express backend
    src/routes/         # health, profile, jobs, applications, ai, stats
  apply-blitz/          # React frontend
    src/pages/          # dashboard, jobs, applications, ai-tailor, resume-analyzer, profile, settings

lib/
  api-spec/             # openapi.yaml — single source of truth for all API contracts
  api-client-react/     # generated React Query hooks (do not edit manually)
  api-zod/              # generated Zod validation schemas (do not edit manually)
  db/                   # Drizzle schema (applications, profile, savedJobs, resumeScans)
```

---

## Development Commands

```bash
# Full typecheck (libs + all artifacts)
pnpm run typecheck

# Regenerate API hooks + Zod schemas after openapi.yaml changes
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes (dev only)
pnpm --filter @workspace/db run push

# Build everything
pnpm run build
```

---

## Architecture

- **OpenAPI-first**: All types flow from `lib/api-spec/openapi.yaml` → codegen → server (Zod validation) and client (React Query hooks)
- **Single user**: No auth — single profile row per deployment
- **Graceful fallbacks**: App is fully functional without any API keys (mock jobs + mock AI)
- **Indian job market focus**: Mock data, salary display (₹ Lakhs), and city names are India-localised

---

## Database Schema

| Table | Purpose |
|---|---|
| `profile` | User profile, resume text, salary targets |
| `applications` | Job applications with status, resume, cover letter, match score |
| `saved_jobs` | Bookmarked job listings from search |
| `resume_scans` | Resume Analyzer history — ATS scores, keyword gaps, sections |
