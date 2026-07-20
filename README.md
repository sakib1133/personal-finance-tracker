# Personal Finance Tracker

A full-stack daily expense tracking application with a React frontend and a Node.js/Express backend backed by Neon PostgreSQL.

🔗 **[Live Demo](https://personal-finance-tracker-cyan-tau.vercel.app/login)** · **[GitHub Repo](https://github.com/sakib1133/personal-finance-tracker)**

## Features

- **Add/Edit Expenses**: Form with validation (no negative amounts, no future dates, category required)
- **Expense Table**: Sortable table showing expenses newest first with edit and delete buttons
- **Filtering**: Filter by category and date range (This Month, Last Month, Custom)
- **Summary Panel**: Shows total this month, total per category, and highest single expense
- **Pie Chart**: Visual representation of spending by category using Recharts
- **CSV Export**: Download currently filtered expenses as CSV file

## Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- Recharts
- Axios

### Backend
- Node.js
- Express
- PostgreSQL via pg
- JWT authentication
- bcryptjs
- UUID

  ## Deployment

- Frontend: Vercel
- Backend: Render
- Database: PostreSQL
- Authentication: JWT

## Project Structure

```
Mini-Expense-Tracker/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ExpenseForm.jsx
│   │   │   ├── ExpenseTable.jsx
│   │   │   ├── FilterBar.jsx
│   │   │   ├── SummaryPanel.jsx
│   │   │   ├── PieChart.jsx
│   │   │   └── ExportButton.jsx
│   │   ├── api/
│   │   │   └── expenses.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
└── server/
    ├── data/
    │   └── expenses.json
    ├── server.js
    └── package.json
```

## Installation

### Server Setup

```bash
cd server
npm install
npm start
```

The server will run on `http://localhost:5000`

### Client Setup

```bash
cd client
npm install
npm run dev
```

The client will run on `http://localhost:3000`

## API Endpoints

- `GET /expenses` - Get all expenses
- `POST /expenses` - Create a new expense
- `PUT /expenses/:id` - Update an expense
- `DELETE /expenses/:id` - Delete an expense

## Expense Data Model

```json
{
  "id": "uuid",
  "amount": 100.50,
  "category": "Food",
  "date": "2024-01-15",
  "note": "Lunch",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

## Categories

- Food
- Transport
- Bills
- Entertainment
- Other

## Author

**Mohd Sakib Malik**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue)](https://www.linkedin.com/in/mohd-sakib-malik-97ab4a283/)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-black)](https://github.com/sakib1133)
[![LeetCode](https://img.shields.io/badge/LeetCode-Profile-orange)](https://leetcode.com/u/sakib_malik79/)
