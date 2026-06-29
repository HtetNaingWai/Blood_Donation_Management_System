# LifeBlood

LifeBlood is a fullstack blood donation management platform built with React, Laravel, PHP, and MySQL for a local XAMPP workflow.


## Tech Stack

- Frontend: React + Vite + JavaScript
- Backend: Laravel + PHP
- Database: MySQL
- Local environment: XAMPP

## Local Setup

### Backend

1. Open `backend/.env` and confirm the MySQL values match your XAMPP database.
2. Create a MySQL database named `lifeblood`.
3. Run:

```bash
cd backend
php artisan migrate
php artisan serve
```

### Frontend

1. Open `frontend/.env.example` and copy it to `.env` if needed.
2. Run:

```bash
cd frontend
npm install
npm run dev
```

## Current Starter Features

- React landing page for LifeBlood
- Laravel API status endpoint at `/api/v1/status`
- Vite proxy configuration for local API calls
- XAMPP-ready MySQL environment defaults

## Donor Account Login 
- htetnaingwai@gmail.com __ Htet@2026


## Patient Account Login 
- naingwai@gmail.com __ Naing@2026