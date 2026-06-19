# TradeMind AI Platform

A modern AI-powered Indian stock market analytics and options intelligence platform.

## Architecture Structure

- **Frontend**: Custom React + Vite architecture powered by Tailwind CSS. Built for a cloud-native single-page deployment.
- **Backend (Export Only)**: A production-ready Python 3.12 FastAPI backend configured for PostgreSQL, Redis, and Gemini 2.5 Flash integrations.

*Note: In the AI Studio Preview environment, the application is strictly bundled as a full-stack Node.js process resolving APIs internally. The generated `backend/` directory provides the parallel microservice structure meant to be extracted for standalone production deployment.*

## Running the Architecture Locally

### 1. Backend API (FastAPI)

Requires Docker:

```bash
docker-compose up --build
```

This will automatically:
- Spin up PostgreSQL
- Spin up Redis
- Build the FastAPI container
- Run Alembic migrations
- Expose the API on `http://localhost:8000`

Ensure you define `GEMINI_API_KEY` in your environment or `.env`.

### 2. Frontend Interface (Vite)

In a separate terminal:

```bash
npm install
npm run dev
```

*(You will need to update the proxy or WS targets in `App.tsx` and `server.ts` to target `ws://localhost:8000` if you fully decouple)*

### Environment Constraints Note

The current real-time data flow in the preview works through the locally provided Express server (`server.ts`). To transition completely to the Python FastApi framework, route your Websocket clients in `App.tsx` to the FastAPI `:8000` port when deployed.
