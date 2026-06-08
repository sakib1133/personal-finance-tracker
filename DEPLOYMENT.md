# Expense Tracker - Deployment Guide

This guide will help you deploy the Expense Tracker application to Render as a single web service.

## Overview

The Expense Tracker is deployed as a single Render Web Service that:
- Serves the React frontend (built with Vite)
- Runs the Express backend API
- Uses SQLite database with persistent storage
- Handles authentication with JWT

## Prerequisites

- A GitHub account with the project pushed to a repository
- A Render account (free tier available)
- Git installed on your local machine

## Architecture

```
┌─────────────────────────────────────┐
│         Render Web Service          │
│  ┌─────────────────────────────┐   │
│  │   Express Server (Node.js)   │   │
│  │  - API Routes                │   │
│  │  - JWT Authentication        │   │
│  │  - SQLite Database           │   │
│  └─────────────────────────────┘   │
│              ↓                     │
│  ┌─────────────────────────────┐   │
│  │   React Build (Static)       │   │
│  │  - Vite Production Build     │   │
│  │  - SPA Routing               │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Deployment Steps

### 1. Prepare Your Local Repository

Ensure your project is committed and pushed to GitHub:

```bash
cd "d:\expenses project"
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Set Up Render

1. Go to [render.com](https://render.com) and sign up/log in
2. Click "New +" → "Web Service"
3. Connect your GitHub account
4. Select your expense-tracker repository
5. Configure the service (see Configuration below)

### 3. Configure Render Service

#### Basic Settings

- **Name**: `expense-tracker` (or your preferred name)
- **Region**: Choose the region closest to your users
- **Branch**: `main`
- **Runtime**: `Node`
- **Build Command**: `cd server && npm install && npm run build`
- **Start Command**: `cd server && npm start`

#### Environment Variables

Add the following environment variables in Render:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `10000` | Render's default port |
| `JWT_SECRET` | `[Generate]` | Click "Generate" to create a secure secret |

**Important**: The `JWT_SECRET` must be set in production. Use Render's "Generate" feature to create a secure random value.

#### Persistent Disk

Configure persistent disk for SQLite database:

- **Name**: `data`
- **Mount Path**: `/opt/render/project/data`
- **Size**: 1 GB (minimum)

### 4. Deploy

Click "Create Web Service" to start the deployment. Render will:

1. Clone your repository
2. Install dependencies (server and client)
3. Build the React frontend
4. Start the Express server
5. Serve the application

The deployment typically takes 3-5 minutes.

### 5. Access Your Application

Once deployed, you can access your application at:
```
https://expense-tracker.onrender.com
```

Replace `expense-tracker` with your service name.

## Using render.yaml (Alternative Method)

If you prefer using `render.yaml` for configuration:

1. Ensure `render.yaml` is in your repository root
2. In Render, click "New +" → "Blueprints"
3. Connect your GitHub repository
4. Render will automatically detect and apply the configuration

## Environment Variables

### Local Development

Create a `.env` file in the `server` directory:

```bash
cd server
cp .env.example .env
```

Edit `.env` and set your values:

```env
PORT=5001
NODE_ENV=development
JWT_SECRET=your-local-dev-secret-key
```

### Production

On Render, environment variables are set in the dashboard. The `JWT_SECRET` should be generated using Render's "Generate" feature for security.

## Database

### SQLite on Render

The SQLite database is stored on Render's persistent disk at:
- **Path**: `/opt/render/project/data/expense_tracker.db`
- **Size**: Up to 1 GB (configurable)

The database is automatically created on first deployment if it doesn't exist.

### Local Development

Locally, the database is stored at:
- **Path**: `server/expense_tracker.db`

### Database Schema

The database includes three tables:
- `users` - User accounts
- `expenses` - Expense records
- `budgets` - Budget settings

Schema is automatically initialized on startup.

## Troubleshooting

### Build Failures

**Issue**: Build fails during deployment

**Solutions**:
- Check the Render logs for specific error messages
- Ensure all dependencies are in `package.json`
- Verify the build command: `cd server && npm install && npm run build`

### Database Errors

**Issue**: Database connection errors

**Solutions**:
- Ensure persistent disk is configured
- Check that mount path is `/opt/render/project/data`
- Verify database initialization logs

### SPA Routing Issues

**Issue**: Direct URL access shows 404

**Solutions**:
- Ensure `NODE_ENV=production` is set
- Verify server.js includes SPA fallback route
- Check that React build is being served correctly

### JWT Secret Errors

**Issue**: Server fails to start with JWT_SECRET error

**Solutions**:
- Ensure `JWT_SECRET` is set in Render environment variables
- Don't use the default placeholder value
- Generate a new secret using Render's "Generate" feature

### Port Issues

**Issue**: Service won't start

**Solutions**:
- Ensure `PORT` environment variable is set to `10000`
- Verify server.js uses `process.env.PORT`
- Check that no other services are using the port

## Verification

After deployment, verify the following:

1. **Homepage**: Access the root URL - should load the login page
2. **Authentication**: Test user registration and login
3. **Protected Routes**: Access `/dashboard`, `/budgets`, `/analytics` - should redirect to login if not authenticated
4. **Expense CRUD**: Create, read, update, and delete expenses
5. **Budget Management**: Create and manage budgets
6. **Analytics**: View analytics dashboard with charts
7. **Direct URL Access**: Refresh pages and access routes directly - should not show 404
8. **Mobile Responsiveness**: Test on different screen sizes

## Updating the Application

To update your deployed application:

1. Make changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```
3. Render will automatically detect the push and redeploy

## Monitoring

### Render Dashboard

Monitor your application through the Render dashboard:
- **Logs**: View real-time and historical logs
- **Metrics**: CPU, memory, and response time
- **Deployments**: Track deployment history

### Health Checks

The application is healthy if:
- Server responds to HTTP requests
- Database is accessible
- Static files are being served

## Security Best Practices

1. **JWT Secret**: Always use a strong, randomly generated secret
2. **Environment Variables**: Never commit `.env` files to Git
3. **HTTPS**: Render automatically provides SSL certificates
4. **Database**: SQLite is on persistent disk, but consider PostgreSQL for production scale
5. **CORS**: CORS is enabled for development; restrict in production if needed

## Scaling

### Current Configuration

- **Plan**: Free tier
- **CPU**: Shared
- **RAM**: 512 MB
- **Disk**: 1 GB persistent

### Scaling Up

If you need more resources:
- Upgrade to a paid Render plan
- Increase disk size for larger databases
- Consider migrating to PostgreSQL for better performance

## Support

For issues specific to:
- **Render**: Check [Render Documentation](https://render.com/docs)
- **This Project**: Open an issue on GitHub

## Summary

Your Expense Tracker is now configured for production deployment on Render with:
- ✅ Single web service architecture
- ✅ React frontend served by Express
- ✅ SQLite database with persistent storage
- ✅ JWT authentication
- ✅ SPA routing support
- ✅ Environment variable configuration
- ✅ Automated builds and deployments

Deploy and enjoy your expense tracking application!
