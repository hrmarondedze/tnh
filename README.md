# TourBridge Zimbabwe — Setup & Architecture Guide

TourBridge is a mobile-first tourism and hospitality community, Talent Passport, and verified career platform for Zimbabwe.

## 1. Architecture & Modular Monolith Structure

- **Database & ORM**: PostgreSQL (Cloud SQL) managed via Drizzle ORM (`src/db/schema.ts`, `src/db/index.ts`, `src/db/drizzle.config.ts`).
- **Authentication & RBAC**: Firebase Authentication (`src/lib/firebase.ts`, `src/lib/firebase-admin.ts`) + server-side authorization middleware (`src/middleware/auth.ts`) + fictional demo persona switcher for testing multi-role workflows.
- **Core Modules (`server.ts` & `src/db/repository.ts`)**:
  - `auth` & `onboarding`: Adaptive branching questionnaire by purpose and 7 career stages; saves progress and generates transparent rule-based career recommendations without requiring an AI API.
  - `members` & `organisations`: Member profiles, privacy controls, and multi-staff organisation memberships (`pending` until Platform Administrator approval).
  - `social` & `portfolio`: Chronological feed (Following & Tourism Community views), Work Showcases, Learning Updates, Achievements, Industry Updates, and Portfolio work items.
  - `passport`: Structured Talent Passport records (Education, Certificates, Achievements, Practical Experience, Skill Assessments) with explicit evidence statuses (`Self-declared`, `Submitted for review`, `Confirmed by an authorised organisation representative`, `Institution-issued credential`, `Disputed`, `Revoked`) and an authorised Private Evidence Vault (`private_documents`).
  - `opportunities`, `applications`, & `placements`: Jobs, Internships, Apprenticeships, and short `Skill2Shift` assignments with a dedicated placement completion state machine (`Terms confirmed → In progress → Completion submitted → Supervisor reviewed → Member accepted or disputed → Finalised`).
  - `careers`, `messaging`, `notifications`, & `moderation`: Curated Zimbabwean tourism career pathways, connection/applicant messaging, notifications, and a Platform Administrator workspace with audit logs.

## 2. Environment Variables (`.env.example`)

- `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`: Runtime PostgreSQL pool credentials.
- `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD`: Admin credentials used by Drizzle Kit for schema migrations.

## 3. Running & Verifying Locally

1. Install dependencies: `npm install`
2. Start full-stack server on port 3000: `npm run dev`
3. Run the automated security & end-to-end acceptance test suite: `npx tsx tests/verify-tourbridge.ts`
