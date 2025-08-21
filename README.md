# Home Assistant - SRE Home Test Assignment

## Overview
A complete full‑stack example implementing simple authentication with tokens, TiDB as the database, Apache Kafka as a broker, TiCDC for Change Data Capture, and structured JSON logging. The entire stack runs via Docker Compose.

## Tech Stack
- Frontend: React (Vite) served by NGINX
- Backend: Node.js + Express
- Database: TiDB (PD + TiKV + TiDB)
- CDC: TiCDC streaming changes to Kafka (canal-json)
- Message Queue: Apache Kafka (KRaft)
- Consumer: Node.js Kafka consumer (Kafkajs)
- Logging: log4js (JSON to stdout)
- Containerization: Docker + Docker Compose

## Services (docker-compose.yml)
- `frontend`: React built and served by NGINX on port 8080
- `backend`: Express API on port 3000
- `pd`, `tikv`, `tidb`: TiDB cluster
- `ticdc`: TiCDC server exposing HTTP on 8300
- `ticdc-init`: waits for TiCDC to be ready and creates a changefeed into Kafka
- `kafka`: Single Kafka broker (KRaft)
- `db-init`: runs `db/init.sql` against TiDB (creates schema + default user)
- `cdc-consumer`: Node app consuming TiCDC messages from Kafka and logging them

## Prerequisites
- Docker
- Docker Compose

## Quick Start
1. Build and start all services:
```bash
docker compose up -d
```
2. Open the apps:
- Frontend: http://localhost:8080

3. Default login:
- Username: `admin`
- Password: `admin123`

## How It Works
- On startup, `db/init.sql` creates database `appdb`, tables `users` and `tokens`, and inserts the default admin with a bcrypt password hash.
- The frontend provides a minimal login form. On success, the backend returns a token and sets the `x-auth-token` header; the frontend stores it in `localStorage`.
- Authenticated requests must include header `x-auth-token: <token>`.
- Every successful login is logged via `log4js` in JSON.
- TiCDC streams DB changes to Kafka topic `tidb-cdc` (canal-json). The `cdc-consumer` service consumes and prints structured log lines.

## API
Base URL: `http://localhost:3000`

- `POST /auth/login`
  - Body: `{ "identifier": "<username|email>", "password": "<password>" }`
  - Success: returns `{ token, user }` and sets header `x-auth-token`

- `GET /auth/me`
  - Headers: `x-auth-token: <token>`
  - Returns the current user

- `POST /auth/logout`
  - Headers: `x-auth-token: <token>`
  - Revokes the token

## Database
- Schema file: `db/init.sql`
- Default DB name: `appdb`
- Tables: `users`, `tokens`
- Default user: `admin / admin123` (bcrypt hash)


## Logging
- Backend logs JSON via `log4js` to stdout. Successful login emits a record with:
  - `timestamp`, `level`, `category`, `message`, `context` (includes `userId`, `action`, `ip`)

View logs:
```bash
docker logs -f node-backend
```

## Change Data Capture (CDC)
- TiCDC changefeed is created automatically by `ticdc-init`
- Consumer logs:
```bash
docker logs -f cdc-consumer
```

## Environment Variables
Backend (`backend` service):
- `TIDB_HOST` (default `tidb`)
- `TIDB_PORT` (default `4000`)
- `TIDB_USER` (default `root`)
- `TIDB_PASSWORD` (default empty)
- `TIDB_DATABASE` (default `appdb`)

Frontend:
- Uses `VITE_API_BASE` if provided at build time; defaults to `http://localhost:3000`.



## Repository Structure
```
.
├─ docker-compose.yml
├─ db/
│  └─ init.sql                  # TiDB schema + default admin
├─ docker-nodejs-sample/        # Backend (Express)
│  ├─ Dockerfile
│  └─ src/
│     ├─ index.js               # API + auth + logging
│     └─ persistence/           # TiDB adapter
├─ docker-reactjs-sample/       # Frontend (React+Vite served by NGINX)
│  ├─ Dockerfile
│  └─ src/App.tsx               # Minimal login UI
└─ cdc-consumer/                # Kafka consumer for TiCDC events
   ├─ Dockerfile
   └─ index.js
```
