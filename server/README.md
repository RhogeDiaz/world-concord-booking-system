# Server (API)

This folder contains a minimal TypeScript + Express server that connects to your Supabase Postgres via `pg`.

Quick start (local):

1. cd server
2. copy `.env.example` to `.env` and fill `DATABASE_URL` and `JWT_SECRET`
3. npm install
4. npm run dev

Endpoints:
- `POST /auth/register` — register shipper
- `POST /auth/login` — login and receive JWT
- `GET /ports` — list ports
