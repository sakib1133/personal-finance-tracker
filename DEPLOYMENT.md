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

Set `VITE_API_URL` in the Vercel project to the deployed Render API base URL
(for example, `https://your-api-service.onrender.com`, without a trailing slash).
Local development can leave it unset because Vite proxies API requests to
`http://localhost:5001`.

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=<Neon Connection String>
JWT_SECRET=<Strong Secret>
CORS_ORIGIN=<Frontend URL>
GOOGLE_CLIENT_ID=<Google OAuth web client ID>
```

Set this separately in the Vercel project:

```env
VITE_API_URL=<Render API base URL>
VITE_GOOGLE_CLIENT_ID=<Same Google OAuth web client ID>
```

Configure the OAuth client in Google Cloud Console as a **Web application** and
add each frontend origin (for example, `http://localhost:3000` and your Vercel
domain) to its authorized JavaScript origins. The client ID is public and is
used by both the frontend and backend; do not add a client secret to the
frontend. Set `GOOGLE_CLIENT_ID` in Render and `VITE_GOOGLE_CLIENT_ID` in
Vercel/local frontend build environments.

Google sign-in needs a one-time manual database migration before deployment.
Back up the database and verify the target connection before applying it. From
the repository root in PowerShell, set `$env:DATABASE_URL` to the intended
database connection string and run:

```powershell
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f server/migrations/20261024_add_google_sign_in.sql
```

The migration only makes `users.password` nullable and adds a nullable unique
`users.google_sub`; it does not remove or rewrite existing user data. Do not
apply it automatically from the application startup process.

Signup requires a password between 6 and 15 characters, a lowercase letter, a
number, and a symbol. Uppercase letters are optional. Passwords are limited to
72 UTF-8 bytes for compatibility with bcrypt.

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