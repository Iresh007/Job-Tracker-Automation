# ApplyBlitz

A full-stack job application tracker & automation app that helps users send 50+ job applications per day with AI-tailored resumes and cover letters.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/apply-blitz run dev` — run the frontend (port 18128)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui (dark theme)
- Backend: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Charts: Recharts
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod validation schemas
- `lib/db/src/schema/` — Drizzle DB schema (profile.ts, applications.ts, savedJobs.ts)
- `artifacts/api-server/src/routes/` — Express route handlers (profile, jobs, applications, ai, stats)
- `artifacts/apply-blitz/src/pages/` — Frontend pages (dashboard, jobs, applications, ai-tailor, profile, settings)

## Architecture decisions

- OpenAPI-first: all types flow from `openapi.yaml` → codegen → both server (Zod) and client (React Query hooks)
- Job search falls back to mock data when `RAPIDAPI_KEY` is not set — app is functional without external APIs
- AI tailoring falls back to mock resume/cover letter when `OPENAI_API_KEY` is not set
- Single user profile (no auth) — profile table has one row per deployment
- Applications use PostgreSQL timestamps for streak/daily stat calculations

## Product

- **Dashboard**: Daily goal progress bar (X/50), streak tracker, 7-day bar chart, pipeline status breakdown, recent applications feed
- **Find Jobs**: Search with filters (role, location, remote, date posted), job cards with match score badges, Quick Apply + batch apply ("Apply to All Selected"), save jobs
- **My Applications**: Table + Kanban view toggle, status dropdown per row, CSV export, search/filter
- **AI Tailor**: Paste job description → get tailored resume + cover letter + ATS match score with keyword badges
- **Profile**: Name, target roles/locations, years of experience, skills, base resume text, salary range, LinkedIn URL
- **Settings**: Daily goal, dry run mode toggle, API key status indicators

## API Keys (optional — app works without them)

- `OPENAI_API_KEY` — enables real AI resume/cover letter tailoring (GPT-4o)
- `RAPIDAPI_KEY` — enables real job search (JSearch API on RapidAPI)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after every OpenAPI spec change before touching route handlers or frontend hooks
- The `applications/batch` route must be registered BEFORE `applications/:id` to avoid Express matching "batch" as an ID
- Job search returns 20 mock jobs when RAPIDAPI_KEY is absent — useful for dev/demo

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
