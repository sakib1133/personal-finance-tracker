# 🚀 Expense Tracker - DevOps Deployment Guide

This project follows a modern DevOps workflow using Docker, GitHub Actions, Render, Neon PostgreSQL, and Vercel.

---

## 🏗️ Architecture

```text
               GitHub Repository
                      │
                git push main
                      │
                      ▼
             GitHub Actions (CI)
        ✔ Build Docker Image
        ✔ Validate Build
                      │
                      ▼
           GitHub Container Registry
                      │
                      ▼
         Render (Docker Web Service)
                      │
              Express REST API
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
     /health Endpoint        Neon PostgreSQL
                      ▲
                      │
           React Frontend (Vercel)
```

---

## ⚙️ Tech Stack

- React + Vite
- Node.js + Express
- PostgreSQL (Neon)
- Docker
- GitHub Actions
- Render
- Vercel
- JWT Authentication

---

## 🚀 Deployment Workflow

### 1. Push Code

```bash
git add .
git commit -m "Update project"
git push origin main
```

### 2. GitHub Actions

- Clone repository
- Build Docker image
- Verify Docker build
- Push image (optional)

### 3. Render

- Pull latest source
- Build Docker image
- Start Express container
- Deploy API

### 4. Database

- Connect to Neon PostgreSQL
- Initialize database schema automatically

### 5. Frontend

- Vercel builds and deploys React application
- Uses Render API

---

## 🔐 Environment Variables

Production frontend API requests use the same-origin `/api` rewrite in
`vercel.json`, which proxies requests to the Render service and keeps the
HttpOnly session cookie first-party. Do not set `VITE_API_URL` in Vercel; the
production client intentionally uses `/api`. Local development can leave it
unset because Vite proxies requests to `http://localhost:5001`.

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=<Neon connection string with sslmode=verify-full>
JWT_SECRET=<Strong Secret>
CORS_ORIGIN=<Frontend URL>
GOOGLE_CLIENT_ID=<Google OAuth web client ID>
```

Set this separately in the Vercel project:

```env
VITE_GOOGLE_CLIENT_ID=<Same Google OAuth web client ID>
```

Use Neon's standard PostgreSQL connection string and explicitly set
`sslmode=verify-full`. The backend also enforces certificate and hostname
verification in production. Node.js validates the certificate chain against
its trusted root certificates; do not add `rejectUnauthorized=false` or
`sslmode=no-verify`.

Configure the OAuth client in Google Cloud Console as a **Web application** and
add each frontend origin (for example, `http://localhost:3000` and your Vercel
domain) to its authorized JavaScript origins. The client ID is public and is
used by both the frontend and backend; do not add a client secret to the
frontend. Set `GOOGLE_CLIENT_ID` in Render and `VITE_GOOGLE_CLIENT_ID` in
Vercel/local frontend build environments.

Google sign-in and security hardening require one-time database migrations
before deploying the corresponding backend code. Back up the database and
verify the target connection out of band; never paste or print the connection
string in a terminal transcript. From the repository root in PowerShell, set
`$env:DATABASE_URL` in the current shell to the intended database connection
string, then run:

```powershell
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f server/migrations/20261024_add_google_sign_in.sql
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f server/migrations/20261025_security_hardening.sql
```

The first migration makes `users.password` nullable and adds a nullable unique
`users.google_sub`. The security migration creates revocable login sessions,
normalizes email casing/whitespace, and adds positive-amount constraints. It
does not delete financial records. It deliberately aborts without committing if
case-insensitive duplicate emails or invalid existing amounts are found. Check
those conditions before migration and resolve any conflict without deleting
accounts or financial data. Apply migrations to a verified staging database
first; do not apply them automatically from application startup.

After deployment, existing browser-stored JWTs are no longer accepted. Users
must sign in again; new sessions are revocable HttpOnly cookies with a 24-hour
expiry. New passwords require at least 12 characters and are limited to 72
UTF-8 bytes for bcrypt compatibility. Existing passwords remain usable.

The Vercel rewrite currently targets the Render API hostname configured in
`client/src/api/index.js` before this same-origin proxy change. If your actual
Render service hostname differs, update the destination in both `vercel.json`
files to the correct public API hostname. This is a public service address, not
a secret.

---

## ✅ Deployment Verification

- API is running
- Database connected
- User authentication works
- Expense CRUD works
- Docker image builds successfully
- GitHub Actions pipeline passes

---

## 📊 DevOps Features

- Docker containerization
- GitHub Actions CI pipeline
- Automated deployments
- Cloud hosting with Render
- Managed PostgreSQL (Neon)
- Separate frontend/backend deployment
- Environment variable management

---

## 📈 CI/CD Flow

```text
Developer
    │
git push
    │
    ▼
GitHub
    │
    ▼
GitHub Actions
(Build Docker Image)
    │
    ▼
Render
(Docker Deployment)
    │
    ▼
Neon PostgreSQL
    ▲
    │
Vercel Frontend
```