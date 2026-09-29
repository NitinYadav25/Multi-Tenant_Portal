# Nexora — Multi-Tenant Project Portal (MERN)

> A modern, secure, enterprise-grade Multi-Tenant Project Portal built using the **MERN** stack (MongoDB, Express, React, Node.js). Designed with strict tenant isolation, granular role-based access control (RBAC), zero data leakage, and a fluid glassmorphism interface faithfully matching the reference design.

---

## 📑 Table of Contents
1. [Project Overview & Tech Stack](#project-overview--tech-stack)
2. [Live Deployment & Demo Credentials](#live-deployment--demo-credentials)
3. [Architecture Overview](#architecture-overview)
4. [How Multi-Tenancy & Tenant Isolation are Implemented](#how-multi-tenancy--tenant-isolation-are-implemented)
5. [Permission Matrix (RBAC)](#permission-matrix-rbac)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Environment Variables](#environment-variables)
8. [Local Setup & Development Guide](#local-setup--development-guide)
9. [Automated Test Suite](#automated-test-suite)
10. [Docker Compose Deployment](#docker-compose-deployment)
11. [Design System & Frontend Architecture](#design-system--frontend-architecture)
12. [Architectural Trade-offs & Engineering Decisions](#architectural-trade-offs--engineering-decisions)
13. [Known Limitations & Future Improvements](#known-limitations--future-improvements)

---

## 1. Project Overview & Tech Stack

Nexora enables organizations to manage projects, assign tasks, and track Kanban workflows in complete isolation. An organization’s data is never visible, accessible, or enumerable by users outside that tenant.

### Core Technologies
- **Frontend:** React 18, Vite, React Router v6, Axios, Plain CSS Design System with CSS Custom Properties (Tokens).
- **Backend:** Node.js (ESM), Express.js, RESTful JSON API.
- **Database:** MongoDB (Atlas in production, local/in-memory for development and testing) + Mongoose ODM.
- **Authentication & Security:** JWT in an **httpOnly cookie** (`SameSite: Lax`), bcrypt password hashing (**cost 12**), `helmet`, strict `cors` with credentials, `express-rate-limit`, `express-mongo-sanitize`, `zod` schema validation (100% strict whitelisting).
- **Testing:** `vitest`, `supertest`, `mongodb-memory-server`.
- **DevOps / Containers:** Docker, Docker Compose, Nginx, GitHub Actions CI.

---

## 2. Live Deployment & Demo Credentials

### Live Deployments
- **Web App (Vercel):** `https://nexora-portal.vercel.app`
- **Backend API (Render):** `https://nexora-api.onrender.com`
- **Health Check Endpoint:** `https://nexora-api.onrender.com/api/health`

*(Note: Render free tier spins down on inactivity; allow 20–40 seconds for initial cold start).*

### Demo User Accounts
All seed accounts use the default password: **`Demo@12345`**

| Email | Name | Acme Inc. Role | Beta Labs Role | Notes |
|---|---|---|---|---|
| **`demo@example.com`** | Demo User | **OWNER** | **MEMBER** | Primary demo account (multi-org) |
| `riya@acme.com` | Riya Sharma | **ADMIN** | — | Project manager |
| `aman@acme.com` | Aman Verma | **MEMBER** | — | Team contributor |
| `neha@acme.com` | Neha Singh | **MEMBER** | — | Frontend developer |
| `karan@beta.io` | Karan Mehta | — | **OWNER** | Beta Labs founder |
| `pooja@beta.io` | Pooja Nair | — | **ADMIN** | Beta Labs engineer |
| `outsider@example.com` | Outsider User | — | — | Zero org memberships (used to test 404 isolation) |

---

## 3. Architecture Overview

### High-Level Architecture Diagram

```
                             [ Browser Client (React 18 + Vite) ]
                                             │
                       httpOnly JWT Cookie   │   Proxy /api Rewrites
                       (Same-Origin)         ▼
                               [ Express.js REST API ]
                                             │
      ┌──────────────────────────────────────┴──────────────────────────────────────┐
      ▼                                      ▼                                      ▼
[ Security & Sanitization ]        [ Auth & Context Injection ]            [ Tenant Scoping ]
• Helmet headers                   • verify JWT from cookie                • orgAccess middleware
• CORS validation                  • load req.user from DB                 • access.js helpers
• Mongo sanitize                   • verify Membership in DB               • 404 disclosure gate
• Zod strict parser                • inject req.membership                 • denormalized org filter
      └──────────────────────────────────────┬──────────────────────────────────────┘
                                             │
                                             ▼
                               [ MongoDB Database (Mongoose) ]
    ┌────────────────┬───────────────────────┴───────────────────────┬────────────────┐
    ▼                ▼                                               ▼                ▼
[ User ]    [ Organization ]                                   [ Project ]        [ Task ]
                 ▲                                                   ▲                ▲
                 │                     [ Membership ]                │                │
                 └─────────────────────── (Join) ────────────────────┴────────────────┘
```

---

## 4. How Multi-Tenancy & Tenant Isolation are Implemented

### 1. Conceptual Verification Chain
Every protected request strictly executes the following chain:

```
Authenticated user (JWT httpOnly cookie → req.user)
  ↓
Organization membership (Membership document lookup in DB; never trusted from client)
  ↓
Role / permissions (req.membership.role evaluated against central permissions matrix)
  ↓
Requested resource belongs to that tenant (organization filter applied to every query)
  ↓
Action permitted or rejected with strict status code (404 vs 403)
```

### 2. Centralized Access Helpers (`server/src/services/access.js`)
Instead of duplicating tenant checks in controllers, controllers invoke single-point access helpers:
- **`getProjectForUser(projectId, userId)`:**
  1. Validates MongoDB ObjectId.
  2. Queries `Project.findById(projectId)`. If absent → throws **404 Not Found**.
  3. Queries `Membership.findOne({ user: userId, organization: project.organization })`.
  4. If caller is **not** a member → throws **404 Not Found** (prevents leaking existence).
  5. Returns `{ project, membership }`.
- **`getTaskForUser(taskId, userId)`:**
  1. Queries `Task.findById(taskId)`. If absent → throws **404 Not Found**.
  2. Queries `Membership.findOne({ user: userId, organization: task.organization })`.
  3. If caller is **not** a member → throws **404 Not Found**.
  4. Returns `{ task, membership }`.
- **`verifyUserBelongsToOrg(orgId, userId)`:**
  Ensures task assignees are members of the task's organization; otherwise throws **400 Invalid Assignee**.

### 3. Resource Disclosure Strategy (404 vs 403 vs 401)
- **Unauthenticated:** returns **401 Unauthorized**.
- **Cross-tenant access attempt:** returns **404 Not Found**. A user attempting to query or mutate a project, task, or organization they do not belong to receives a 404 identical to a non-existent URL. The existence of foreign tenant resources is never leaked.
- **Insufficient Role within the Tenant:** returns **403 Forbidden**. When a user belongs to the organization but lacks the required permission (e.g. a MEMBER attempting to delete a project), a 403 is returned.
- **Last Owner Protection:** returns **409 Conflict** if an organization's sole OWNER is removed or demoted.

### 4. Denormalized Tenant Key on Tasks
While tasks belong to a `project`, the `organization` ObjectId is denormalized directly onto every `Task` document (enforced as `immutable: true`).
- **Why:** Every task query, update, deletion, and dashboard aggregation directly applies `{ organization: orgId }` without requiring `$lookup` joins on projects, ensuring constant-time tenant indexing and elimination of cross-project leakage.

---

## 5. Permission Matrix (RBAC)

Implemented centrally in `server/src/services/permissions.js`:

| Action | OWNER | ADMIN | MEMBER | Enforced By |
|---|:---:|:---:|:---:|---|
| **View org, members, projects, tasks** | ✅ | ✅ | ✅ | `permissions.canView` |
| **Create / update / delete project** | ✅ | ✅ | ❌ | `permissions.canManageProject` |
| **Create task** | ✅ | ✅ | ✅ | `permissions.canCreateTask` |
| **Update task (all fields)** | ✅ | ✅ | Only if creator | `permissions.canUpdateTaskFull` |
| **Change status/priority of task** | ✅ | ✅ | Creator **or** assignee | `permissions.canUpdateTaskStatusPriority` |
| **Delete task** | ✅ | ✅ | Only if creator | `permissions.canDeleteTask` |
| **Add member (by email)** | ✅ | ✅ (MEMBER only) | ❌ | `permissions.canAddMember` |
| **Change member role** | ✅ | ❌ | ❌ | `permissions.canChangeMemberRole` |
| **Remove member** | ✅ | ✅ (MEMBERs only) | ❌ | `permissions.canRemoveMember` |
| **Delete organization** | ✅ | ❌ | ❌ | `permissions.canDeleteOrganization` |

---

## 6. API Endpoints Reference

Base URL: `/api` (Standard JSON contract)
- **Success:** `{ "success": true, "data": ... , "meta"?: { ... } }`
- **Error:** `{ "success": false, "error": { "code": "...", "message": "...", "details"?: [ ... ] } }`

### Public / Health
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/api/health` | Service health status | No |

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Rate Limited |
|---|---|---|:---:|
| `POST` | `/api/auth/register` | Create user account, set httpOnly cookie | Yes (20 / 15m) |
| `POST` | `/api/auth/login` | Login, set httpOnly cookie | Yes (20 / 15m) |
| `POST` | `/api/auth/logout` | Clear auth cookie | No |
| `GET` | `/api/auth/me` | Current user + organization memberships | Yes (Auth) |

### Organizations (`/api/organizations`)
| Method | Endpoint | Description | Access Required |
|---|---|---|:---:|
| `GET` | `/api/organizations` | List all organizations caller belongs to | Authenticated |
| `POST` | `/api/organizations` | Create organization (caller becomes OWNER) | Authenticated |
| `GET` | `/api/organizations/:organizationId` | Get organization details & member count | Member |
| `DELETE` | `/api/organizations/:organizationId` | Cascade delete organization & all data | OWNER only |
| `GET` | `/api/organizations/:organizationId/stats` | Aggregated dashboard counts & activity | Member |

### Members (`/api/organizations/:organizationId/members`)
| Method | Endpoint | Description | Access Required |
|---|---|---|:---:|
| `GET` | `/api/organizations/:organizationId/members` | List members in organization | Member |
| `POST` | `/api/organizations/:organizationId/members` | Invite member by email | OWNER / ADMIN |
| `PATCH` | `/api/organizations/:organizationId/members/:userId` | Update member role | OWNER only |
| `DELETE` | `/api/organizations/:organizationId/members/:userId` | Remove member from org | OWNER / ADMIN |

### Projects (`/api/organizations/:organizationId/projects` & `/api/projects`)
| Method | Endpoint | Description | Access Required |
|---|---|---|:---:|
| `GET` | `/api/organizations/:organizationId/projects` | List projects (search, pagination, progress) | Member |
| `POST` | `/api/organizations/:organizationId/projects` | Create project | OWNER / ADMIN |
| `GET` | `/api/projects/:projectId` | Get project details & task counts | Member |
| `PATCH` | `/api/projects/:projectId` | Update name / description | OWNER / ADMIN |
| `DELETE` | `/api/projects/:projectId` | Delete project (cascades to tasks) | OWNER / ADMIN |

### Tasks (`/api/projects/:projectId/tasks` & `/api/tasks`)
| Method | Endpoint | Description | Access Required |
|---|---|---|:---:|
| `GET` | `/api/projects/:projectId/tasks` | List project tasks (filters: status, priority) | Member |
| `POST` | `/api/projects/:projectId/tasks` | Create task with member assignee check | Member |
| `PATCH` | `/api/tasks/:taskId` | Update task fields (granular RBAC) | Owner/Admin/Creator/Assignee |
| `DELETE` | `/api/tasks/:taskId` | Delete task | Owner/Admin/Creator |

---

## 7. Environment Variables

### Server (`server/.env`)
| Variable | Required | Default | Description |
|---|:---:|---|---|
| `PORT` | No | `5000` | Port Express server listens on |
| `NODE_ENV` | No | `development` | Environment mode (`development`, `production`, `test`) |
| `MONGODB_URI` | **Yes** | `mongodb://localhost:27017/nexora` | MongoDB connection string |
| `JWT_SECRET` | **Yes** | — | Strong secret key (min 16 chars) for signing tokens |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiration duration |
| `CLIENT_URL` | No | `http://localhost:5173` | Explicit CORS origin for browser requests |
| `COOKIE_SAMESITE` | No | `lax` | SameSite cookie policy (`lax`, `none`, `strict`) |

### Client (`client/.env`)
| Variable | Required | Default | Description |
|---|:---:|---|---|
| `VITE_API_URL` | No | ` ` *(empty string)* | API base path; empty uses Vite proxy/Vercel rewrites |

---

## 8. Local Setup & Development Guide

### Prerequisites
- **Node.js:** v18.0.0+ (Tested on Node.js v24)
- **npm:** v9.0.0+
- **MongoDB:** MongoDB 6.0+ (local instance or free Atlas cluster)

### 1. Clone & Install
```bash
git clone https://github.com/<your-username>/nexora-multi-tenant-portal.git
cd nexora-multi-tenant-portal

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure Environment Files
```bash
# Server env
cd ../server
cp .env.example .env

# Client env
cd ../client
cp .env.example .env
```

### 3. Seed Database
Wipes and populates demo users, organizations, projects, and tasks:
```bash
cd ../server
npm run seed
```

### 4. Run Development Servers
In two separate terminal windows:

```bash
# Terminal 1: Backend Server (starts on http://localhost:5000)
cd server
npm run dev

# Terminal 2: Frontend App (starts on http://localhost:5173)
cd client
npm run dev
```

Open `http://localhost:5173` in your browser. Demo credentials are pre-filled on the login screen.

---

## 9. Automated Test Suite

The test suite utilizes **Vitest** + **Supertest** + **`mongodb-memory-server`** for isolated, deterministic execution:

```bash
cd server
npm test
```

### Test Coverage Highlights (23 Tests across 5 Suites)
1. **`auth.test.js`**: User registration, bcrypt cost 12 verification, password omitted from queries, duplicate email rejection (409), generic login failure message, protected `/api/auth/me` endpoint.
2. **`tenant-isolation.test.js`**:
   - Cross-tenant project access rejection (**404 Not Found**) with zero data leakage.
   - Cross-tenant project listing rejection (**404 Not Found**).
   - Cross-tenant creation attempts rejected (both URL and body parameters).
   - Cross-tenant task modification and deletion rejected (**404 Not Found**).
   - Multi-tenant user switching isolation (caller sees only active org data).
3. **`projects.test.js`**: MEMBER forbidden from project creation/deletion (**403 Forbidden**); ADMIN permitted; cascade task deletion on project removal.
4. **`tasks.test.js`**: Assignee membership validation in task's organization (**400 Invalid Assignee**); member status update permission; outsider member rejection.
5. **`members.test.js`**: Last-owner protection preventing demotion and removal (**409 Conflict**); ADMIN member invitation limitations; MEMBER invitation block.

---

## 10. Docker Compose Deployment

Run the complete multi-tier application (MongoDB + Express Backend + React Nginx Client) locally in one command:

```bash
docker compose up --build
```
- Client accessible at: `http://localhost:5173`
- Backend accessible at: `http://localhost:5000`
- MongoDB accessible at: `localhost:27017`

---

## 11. Design System & Frontend Architecture

Faithfully ported from the attached interactive specification (`portal-ui-v2.html`):
- **Typography:** `Plus Jakarta Sans` with weights 400–800.
- **Glassmorphism:** `backdrop-filter: blur(20px)`, 1px subtle glass borders, soft dual-colored box shadows.
- **Live `<AnimatedBackground />`:**
  - 4 blurred aurora gradient blobs (`b1`..`b4`) with alternating CSS translation animations.
  - Moving grid pattern with radial-mask edge fade.
  - Particle network canvas (up to 80 particles dynamically scaled to screen dimensions) with mouse repulsion, distance-based line connections, theme awareness, and `prefers-reduced-motion` compliance.
- **Interactive Kanban Board:**
  - HTML5 native drag-and-drop between To Do, In Progress, and Done.
  - Optimistic UI state updates with rollback on network failure.
  - Keyboard-operable modal dropdowns for full accessibility.
- **Light & Dark Mode:**
  - Pure CSS variables on `:root` and `:root[data-theme="dark|light"]`.
  - Persisted in `localStorage` with real-time particle canvas color syncing.

---

## 12. Architectural Trade-offs & Engineering Decisions

1. **Separate `Membership` Join Collection vs. Embedded Array:**
   - *Decision:* Used a separate `Membership` collection with compound unique index `{ user: 1, organization: 1 }`.
   - *Rationale:* If memberships were embedded inside `User` or `Organization`, updating roles or listing members in large organizations would trigger document growth, race conditions, and expensive write locks. A separate collection scales linearly, allows indexing by user or org independently, and makes permission lookups `O(1)`.
2. **JWT in `httpOnly` Cookie vs. `localStorage`:**
   - *Decision:* Stored JWT strictly in an `httpOnly`, `SameSite: Lax` cookie.
   - *Rationale:* `localStorage` is vulnerable to Cross-Site Scripting (XSS) credential theft. An `httpOnly` cookie cannot be read by JavaScript, providing solid token protection.
3. **404 Not Found vs. 403 Forbidden for Cross-Tenant Access:**
   - *Decision:* Returning 404 whenever a caller requests a resource outside their tenant.
   - *Rationale:* Returning 403 leaks that a resource ID or organization slug exists on the platform. Returning 404 ensures zero existence enumeration.
4. **Denormalization of `organization` on Tasks:**
   - *Decision:* Stored `organization` directly on `Task` (immutable).
   - *Rationale:* Avoids multi-stage `$lookup` aggregation joins across `Project` collections for task queries and dashboard statistics.
5. **Vercel Reverse Proxy Rewrites:**
   - *Decision:* Configured `client/vercel.json` rewrites (`/api/(.*)` → `backend/api/$1`).
   - *Rationale:* Treats the API as same-origin, allowing browsers (including Safari ITP) to reliably send `httpOnly` cookies with `SameSite: Lax` without cross-domain third-party cookie restrictions.

---

## 13. Known Limitations & Future Improvements

1. **Transactional Email Deliverability:** Member invitations currently require the invited email to exist in the database. In a production SaaS, integrating Resend or SendGrid to send invitation links with signed single-use invitation tokens would enable onboarding new users directly.
2. **Refresh Token Rotation & Invalidation:** Currently, tokens use a 7-day expiration. Implementing a short-lived access token (15 mins) paired with a `tokenVersion` or rotated refresh token stored in Redis allows immediate instant session revocation across devices.
3. **Audit Trail Logging:** A dedicated `AuditLog` collection recording tenant actor, action, IP, and timestamp for compliance requirements (SOC2 / ISO27001).
4. **Cursor-based Pagination:** Project and task lists currently support standard skip/limit pagination; cursor-based pagination would enhance performance for tenants with tens of thousands of tasks.
5. **Real-time WebSockets:** Upgrading board synchronization to WebSocket/SSE so collaborative drag-and-drop updates reflect immediately across multiple active team member tabs.

---

## 14. Verification Checklist (Definition of Done)

- [x] Register / login / logout work; routes protected; session bootstraps with `/api/auth/me`.
- [x] Passwords hashed with bcrypt (cost 12); JWT stored in httpOnly cookie; no secrets committed.
- [x] User in multiple orgs can switch; all queries dynamically re-scoped; backend validates membership on every request.
- [x] Cross-tenant access (URL, body, query, IDs) returns 404 with zero data leakage.
- [x] Role permissions enforced server-side (Owner, Admin, Member) and reflected accurately in UI.
- [x] Full CRUD for projects and tasks with status, priority, due date, labels, and member assignee checks.
- [x] Loading skeleton states, empty states, validation error displays, and toast notifications.
- [x] UI reproduces `portal-ui-v2.html` faithfully including live mouse-repelling animated background.
- [x] Seed script (`npm run seed`) populates realistic demo content for Acme Inc. and Beta Labs.
- [x] All 23 automated tests pass cleanly (`npm test`).
- [x] Docker Compose and GitHub Actions CI configured.
